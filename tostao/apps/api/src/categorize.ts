// Palavras-chave -> categoria padrão (v1; a categorização por IA entra depois). A ordem importa.
const GUESS: [RegExp, string][] = [
  [/pagamento (de )?fatura|fatura do cart/i, "Transferências"],
  [/sal[áa]rio|folha de pagamento/i, "Salário"],
  [/mercado|supermerc|atacad|hortifruti/i, "Supermercado"],
  [/uber|metr[ôo]|[ôo]nibus|combust|posto |estacionamento/i, "Transporte"],
  [/ifood|restaurante|lanche|padaria|pizza|caf[ée]/i, "Alimentação"],
  [/netflix|spotify|youtube|prime|assinatura|gympass/i, "Assinaturas"],
  [/aluguel|condom[ií]nio|energia|[áa]gua|internet|luz /i, "Moradia"],
  [/farm[áa]cia|drogaria|consulta|hospital|exame/i, "Saúde"],
  [/curso|escola|faculdade|livraria|livro/i, "Educação"],
  [/cinema|show|ingresso|jogo|bar /i, "Lazer"],
  [/cdb|tesouro|invest|aplica[çc][ãa]o/i, "Investimentos"],
  [/pix|transfer[êe]ncia|ted |doc /i, "Transferências"],
];

/** Pagamento de fatura é transferência interna: fica fora de receitas e despesas. */
export const isBillPayment = (description: string) => /pagamento (de )?fatura|fatura do cart/i.test(description);

export const guessCategory = (description: string) => GUESS.find(([re]) => re.test(description))?.[1] ?? "Outros";
