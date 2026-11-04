import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.cambio import Cambio, entender, eh_pergunta_de_cambio, formatar  # noqa: E402


class IAFalsa:
    def __init__(self, resposta="A melhor é a Casa X."):
        self.resposta, self.prompts = resposta, []

    def __call__(self, prompt, **_):
        self.prompts.append(prompt)
        return self.resposta


class TestCambio(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.c = Cambio(self.tmp)

    def test_entende_valor_e_moedas(self):
        self.assertEqual(entender("onde troco 2000 reais por guaranis?"), ("BRL", "PYG", 2000.0))
        self.assertEqual(entender("quiero cambiar 100 dolares a reales"), ("USD", "BRL", 100.0))
        self.assertEqual(entender("trocar 1.500 reais"), ("BRL", "PYG", 1500.0))
        self.assertEqual(entender("2 mil reais"), ("BRL", "PYG", 2000.0))

    def test_detecta_pergunta(self):
        self.assertTrue(eh_pergunta_de_cambio("Onde é melhor trocar dinheiro?"))
        self.assertFalse(eh_pergunta_de_cambio("O que o nervo radial inerva?"))

    def test_ranking_da_melhor_para_a_pior(self):
        r = self.c.comparar("BRL", "PYG", 1000)
        recebe = [x["recebe"] for x in r["ranking"]]
        self.assertEqual(recebe, sorted(recebe, reverse=True))
        self.assertEqual(r["ranking"][-1]["a_mais"], 0)
        self.assertEqual(r["economia"], recebe[0] - recebe[-1])
        self.assertTrue(r["exemplo"])

    def test_filtra_cidade(self):
        r = self.c.comparar("BRL", "PYG", 1000, "Foz do Iguaçu")
        self.assertTrue(r["ranking"])
        self.assertTrue(all(x["cidade"] == "Foz do Iguaçu" for x in r["ranking"]))

    def test_atualizar_casa_e_cliques(self):
        self.c.atualizar_casa("nova", {"nome": "Casa Nova", "cidade": "Ciudad del Este", "cotacoes": {"BRL>PYG": 9999, "XXX>PYG": 1}, "exemplo": False})
        r = self.c.comparar("BRL", "PYG", 1)
        self.assertEqual(r["ranking"][0]["nome"], "Casa Nova")
        self.assertFalse(r["exemplo"])
        self.assertEqual(self.c.registrar_clique("anuncio", "a1"), 1)
        self.assertEqual(self.c.registrar_clique("anuncio", "a1"), 2)

    def test_responde_sem_ia_e_avisa_exemplo(self):
        r = self.c.responder("onde troco 1000 reais?", "pt")
        self.assertEqual(r["modo"], "regra")
        self.assertIn("exemplo", r["resposta"])

    def test_ia_recebe_so_a_tabela(self):
        ia = IAFalsa()
        r = self.c.responder("onde troco 1000 reais?", "es", ia)
        self.assertEqual(r["modo"], "ia")
        self.assertIn("TABELA", ia.prompts[0])
        self.assertIn("EXEMPLO", ia.prompts[0])
        self.assertIn("español", ia.prompts[0])

    def test_formatar(self):
        self.assertEqual(formatar(1395000, "PYG"), "Gs 1.395.000")
        self.assertEqual(formatar(184.5, "USD"), "US$ 184,50")


if __name__ == "__main__":
    unittest.main()
