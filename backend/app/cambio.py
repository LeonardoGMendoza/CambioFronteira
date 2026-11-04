"""CambioFronteira: comparador de câmbio da fronteira (tipo Trivago): mostra qual casa paga mais hoje.
As casas e os anúncios ficam em cambio_casas.json (modelo) e, depois de atualizados pela API, em DADOS/cambio.json.
A IA só explica os números da tabela: nunca inventa cotação."""
import json
import logging
import re
import threading
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger("studentmedical.cambio")
MODELO = Path(__file__).resolve().parent / "cambio_casas.json"
MOEDAS = {"BRL", "PYG", "USD", "ARS"}
CASAS_DECIMAIS = {"PYG": 0, "BRL": 2, "USD": 2, "ARS": 0}
SIMBOLO = {"BRL": "R$", "PYG": "Gs", "USD": "US$", "ARS": "AR$"}

# palavras que o aluno usa para cada moeda (sem acento, minúsculas)
NOMES_MOEDA = [
    ("BRL", r"reales|reais|real|r\$|brl"),
    ("PYG", r"guaranis?|guaranies|gs\.?|pyg"),
    ("USD", r"dolar(es)?|dolares|us\$|usd|dollars?"),
    ("ARS", r"pesos?( argentinos?)?|ars"),
]
PALAVRAS_CAMBIO = re.compile(r"\b(cambio|cambiar|cambios|trocar|troco|troca|casa de cambio|cotacao|cotacion|exchange|guaranis?|dolar|reais)\b")

FRASES = {
    "es": {"melhor": "Hoy, para cambiar {valor}, la mejor opción es {casa} ({cidade}): recibes {recebe}. Frente a la peor, ganas {economia}.",
           "sem": "Todavía no tengo cotizaciones para ese cambio.", "exemplo": "Ojo: por ahora son valores de ejemplo, no cotizaciones reales."},
    "pt": {"melhor": "Hoje, para trocar {valor}, a melhor opção é {casa} ({cidade}): você recebe {recebe}. Em relação à pior, você ganha {economia}.",
           "sem": "Ainda não tenho cotações para essa troca.", "exemplo": "Atenção: por enquanto são valores de exemplo, não cotações reais."},
    "en": {"melhor": "Today, to exchange {valor}, the best option is {casa} ({cidade}): you get {recebe}. Compared with the worst, you gain {economia}.",
           "sem": "I don't have rates for that exchange yet.", "exemplo": "Note: for now these are sample values, not real rates."},
}
IDIOMA_NOME = {"es": "español (de Paraguay, neutro)", "pt": "português do Brasil", "en": "English"}

PROMPT = """Você é o assistente de câmbio do aplicativo CambioFronteira, para quem vive ou visita a Tríplice Fronteira (Ciudad del Este, Foz do Iguaçu).
Responda SEMPRE em {idioma}, em no máximo 3 frases curtas (a resposta será falada em voz alta).
Use SOMENTE os números da TABELA abaixo. Nunca invente cotação, casa, endereço ou taxa. Se a tabela não responde a pergunta, diga isso e sugira consultar a casa.
Diga qual casa paga mais e quanto o aluno ganha em relação à pior. Lembre que a cotação muda durante o dia e pode mudar no balcão.
{aviso_exemplo}
TABELA (troca de {valor}, da melhor para a pior; atualizada em {atualizado}):
{tabela}

O aluno perguntou: "{texto}"
Responda só com o texto da resposta, sem JSON."""


def _sem_acento(s):
    import unicodedata  # noqa: PLC0415
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def formatar(valor, moeda):
    casas = CASAS_DECIMAIS.get(moeda, 2)
    texto = f"{valor:,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{SIMBOLO.get(moeda, moeda)} {texto}"


def eh_pergunta_de_cambio(texto):
    return bool(PALAVRAS_CAMBIO.search(_sem_acento(texto or "")))


def entender(texto, padrao=("BRL", "PYG", 1000.0)):
    """Tira da frase o valor e as moedas: 'onde troco 2000 reais por guaranis' -> (BRL, PYG, 2000)."""
    limpo = _sem_acento(texto or "")
    achadas = []
    for codigo, padrao_re in NOMES_MOEDA:
        for m in re.finditer(rf"(?<![a-z]){padrao_re}(?![a-z])", limpo):
            achadas.append((m.start(), codigo))
    ordem = [c for _, c in sorted(achadas)]
    ordem = list(dict.fromkeys(ordem))
    numero = re.search(r"(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d+))?\s*(mil)?", limpo)
    valor = padrao[2]
    if numero:
        valor = float(re.sub(r"[.\s]", "", numero.group(1)) + ("." + numero.group(2) if numero.group(2) else ""))
        if numero.group(3):
            valor *= 1000
    de, para = padrao[0], padrao[1]
    if len(ordem) >= 2:
        de, para = ordem[0], ordem[1]
    elif len(ordem) == 1:
        de = ordem[0]
        para = "PYG" if de != "PYG" else "BRL"
    return de, para, valor


class Cambio:
    def __init__(self, pasta_dados, modelo=MODELO):
        self.arquivo = Path(pasta_dados) / "cambio.json"
        self.cliques_arquivo = Path(pasta_dados) / "cambio_cliques.json"
        self.modelo = Path(modelo)
        self._lock = threading.Lock()

    # ---------- dados ----------
    def dados(self):
        origem = self.arquivo if self.arquivo.exists() else self.modelo
        return json.loads(origem.read_text(encoding="utf-8"))

    def _salvar(self, dados):
        self.arquivo.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.arquivo.with_suffix(".tmp")
        tmp.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.arquivo)

    def publico(self):
        """O que o app recebe: casas, anúncios e se ainda é exemplo (sem nada interno)."""
        d = self.dados()
        return {k: d.get(k) for k in ("exemplo", "atualizado_em", "anuncie", "casas", "anuncios")}

    def atualizar_casa(self, casa_id, novo):
        """Cria ou atualiza uma casa (cotações, nome, contato, parceiro). Marca a hora da atualização."""
        with self._lock:
            d = self.dados()
            cotacoes = {}
            for par, taxa in (novo.get("cotacoes") or {}).items():
                de, _, para = par.partition(">")
                if de in MOEDAS and para in MOEDAS and de != para and float(taxa) > 0:
                    cotacoes[par] = float(taxa)
            casa = next((c for c in d["casas"] if c["id"] == casa_id), None)
            if casa is None:
                casa = {"id": casa_id, "nome": casa_id, "cidade": "", "bairro": "", "whatsapp": "", "mapa": "", "parceiro": False, "cotacoes": {}}
                d["casas"].append(casa)
            for campo in ("nome", "cidade", "bairro", "whatsapp", "mapa", "parceiro"):
                if campo in novo:
                    casa[campo] = novo[campo]
            if cotacoes:
                casa["cotacoes"].update(cotacoes)
            casa["atualizado_em"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            d["atualizado_em"] = casa["atualizado_em"]
            if "exemplo" in novo:
                d["exemplo"] = bool(novo["exemplo"])
            self._salvar(d)
            return casa

    def registrar_clique(self, tipo, item_id):
        """Conta cliques em casas e anúncios: é o número que você mostra ao vender a parceria."""
        with self._lock:
            try:
                cont = json.loads(self.cliques_arquivo.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                cont = {}
            chave = f"{tipo}:{item_id}"[:80]
            cont[chave] = cont.get(chave, 0) + 1
            self.cliques_arquivo.parent.mkdir(parents=True, exist_ok=True)
            self.cliques_arquivo.write_text(json.dumps(cont, ensure_ascii=False, indent=2), encoding="utf-8")
            return cont[chave]

    def cliques(self):
        try:
            return json.loads(self.cliques_arquivo.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    # ---------- comparação ----------
    def comparar(self, de="BRL", para="PYG", valor=1000.0, cidade=""):
        d = self.dados()
        par = f"{de}>{para}"
        lista = []
        for c in d.get("casas", []):
            if cidade and c.get("cidade") != cidade:
                continue
            taxa = (c.get("cotacoes") or {}).get(par)
            if not taxa:
                continue
            lista.append({"id": c["id"], "nome": c["nome"], "cidade": c.get("cidade", ""), "bairro": c.get("bairro", ""),
                          "whatsapp": c.get("whatsapp", ""), "mapa": c.get("mapa", ""), "parceiro": bool(c.get("parceiro")),
                          "taxa": taxa, "recebe": round(valor * taxa, CASAS_DECIMAIS.get(para, 2))})
        lista.sort(key=lambda x: x["recebe"], reverse=True)
        pior = lista[-1]["recebe"] if lista else 0
        for i, item in enumerate(lista):
            item["posicao"] = i + 1
            item["a_mais"] = round(item["recebe"] - pior, CASAS_DECIMAIS.get(para, 2))
        return {"de": de, "para": para, "valor": valor, "cidade": cidade, "exemplo": bool(d.get("exemplo")),
                "atualizado_em": d.get("atualizado_em"), "ranking": lista,
                "economia": lista[0]["a_mais"] if lista else 0}

    # ---------- IA ----------
    def responder(self, texto, idioma="pt", chat=None):
        idioma = idioma if idioma in FRASES else "pt"
        frases = FRASES[idioma]
        de, para, valor = entender(texto)
        comp = self.comparar(de, para, valor)
        r = comp["ranking"]
        if not r:
            return {"resposta": frases["sem"], "comparacao": comp, "modo": "sem-dados"}
        melhor = r[0]
        fixa = frases["melhor"].format(valor=formatar(valor, de), casa=melhor["nome"], cidade=melhor["cidade"],
                                       recebe=formatar(melhor["recebe"], para), economia=formatar(comp["economia"], para))
        if comp["exemplo"]:
            fixa += " " + frases["exemplo"]
        if chat is None:
            return {"resposta": fixa, "comparacao": comp, "modo": "regra"}
        tabela = "\n".join(f"{x['posicao']}. {x['nome']} ({x['cidade']}, {x['bairro']}): taxa {x['taxa']} -> recebe {formatar(x['recebe'], para)}"
                           for x in r)
        prompt = PROMPT.format(idioma=IDIOMA_NOME[idioma], valor=formatar(valor, de), atualizado=comp["atualizado_em"], tabela=tabela,
                               texto=texto[:400],
                               aviso_exemplo="IMPORTANTE: estes valores são de EXEMPLO (ainda não são cotações reais); avise o aluno." if comp["exemplo"] else "")
        try:
            resposta = chat(prompt, max_tokens=220, temperature=0.2).strip()
        except Exception as erro:  # noqa: BLE001
            log.warning("IA do câmbio falhou: %s", type(erro).__name__)
            return {"resposta": fixa, "comparacao": comp, "modo": "regra"}
        return {"resposta": resposta or fixa, "comparacao": comp, "modo": "ia"}
