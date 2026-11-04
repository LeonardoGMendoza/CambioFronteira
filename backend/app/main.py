"""API do CambioFronteira: comparador de casas de câmbio da Tríplice Fronteira (tipo Trivago) com IA."""
import os
import re
import time
from collections import defaultdict, deque

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import carregar_env

carregar_env()

from .cambio import MOEDAS, Cambio  # noqa: E402
from .ia import oracle_do_ambiente  # noqa: E402

DADOS = os.getenv("CF_DATA_DIR", "./data")
TOKEN = os.getenv("CF_TOKEN", "")
app = FastAPI(title="CambioFronteira API", version="0.1.0")
origens = [o.strip() for o in os.getenv("CF_ORIGENS", "http://localhost:5500,http://localhost:8080,https://leonardogmendoza.github.io").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origens, allow_methods=["GET", "POST", "PUT"], allow_headers=["*"])

cambio = Cambio(DADOS)
chat = oracle_do_ambiente()
ID_OK = re.compile(r"^[a-zA-Z0-9_-]{1,40}$")
_pedidos = defaultdict(deque)


def limitar(request: Request, maximo=30, janela=60):
    """Protege o custo da IA: no máximo 30 perguntas por minuto por IP."""
    ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-real-ip") or (request.client.host if request.client else "?")
    agora, fila = time.time(), _pedidos[(ip, maximo)]
    while fila and agora - fila[0] > janela:
        fila.popleft()
    if len(fila) >= maximo:
        raise HTTPException(429, "Muitos pedidos. Espere um minuto.")
    fila.append(agora)


def exigir_token(request: Request):
    if not TOKEN:
        raise HTTPException(503, "Defina CF_TOKEN no .env para atualizar cotações.")
    if request.headers.get("x-token", "") != TOKEN:
        raise HTTPException(401, "Token inválido.")


class Pergunta(BaseModel):
    texto: str = Field(..., min_length=1, max_length=400)
    idioma: str = Field("pt", max_length=5)


class Clique(BaseModel):
    tipo: str = Field(..., pattern=r"^(casa|anuncio|whatsapp|mapa)$")
    id: str = Field(..., min_length=1, max_length=40)


class Casa(BaseModel):
    nome: str | None = Field(None, max_length=80)
    cidade: str | None = Field(None, max_length=40)
    bairro: str | None = Field(None, max_length=80)
    whatsapp: str | None = Field(None, max_length=20)
    mapa: str | None = Field(None, max_length=300)
    parceiro: bool | None = None
    exemplo: bool | None = None
    cotacoes: dict[str, float] = Field(default_factory=dict)


@app.get("/api/saude")
def saude():
    return {"ok": True, "ia": chat is not None}


@app.get("/api/cambio")
def comparar(de: str = "BRL", para: str = "PYG", valor: float = 1000, cidade: str = ""):
    de, para = de.upper(), para.upper()
    if de not in MOEDAS or para not in MOEDAS or de == para or not (0 < valor <= 10_000_000):
        raise HTTPException(422, "Moeda ou valor inválido.")
    return cambio.comparar(de, para, valor, cidade[:40])


@app.get("/api/casas")
def casas():
    return cambio.publico()


@app.post("/api/perguntar")
def perguntar(p: Pergunta, request: Request):
    limitar(request)
    return cambio.responder(p.texto, p.idioma, chat)


@app.post("/api/clique")
def clique(c: Clique, request: Request):
    limitar(request, maximo=60)
    return {"ok": True, "total": cambio.registrar_clique(c.tipo, c.id)}


@app.put("/api/casas/{casa_id}")
def atualizar_casa(casa_id: str, casa: Casa, request: Request):
    exigir_token(request)
    if not ID_OK.match(casa_id):
        raise HTTPException(422, "Identificador inválido.")
    return cambio.atualizar_casa(casa_id, casa.model_dump(exclude_none=True))


@app.get("/api/cliques")
def ver_cliques(request: Request):
    exigir_token(request)
    return cambio.cliques()
