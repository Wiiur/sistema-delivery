-- 1. Tab4ela de Usuários (cliente e funcionário)
CREATE TABLE usuarios(
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    numero_telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha TEXT NOT NULL, -- Armazenar a senha de forma segura (hash)
    tipo_usuario VARCHAR(20) DEFAULT 'cliente', --'Cliente' ou 'Funcionário'
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- 2. tAbela de categorias de produtos (ex: bebidas, lanches, sobremesas)
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

-- 3. tabela de produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    categoria_id INTERGER REFERENCES categorias(id),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco_venda DECIMAL(10, 2) NOT NULL,
    preco_custo DECIMAL(10, 2) NOT NULL,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    em_destaque BOOLEAN DEFAULT FALSE
);

-- 4. tabela de pedidos (O cabeçalho do pedido)
CREATE TABLE pedidos(
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    total DECIMAL(0, 2) NOT NULL,
    taxa_entrega DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'Pendente', -- Pendente, Em Preparo, Pronto para Entrega, Entregue, Cancelado
    METODO_PAGAMENTO varchar(30) DEFAULT 'Dinheiro', -- Dinheiro, Cartão de Crédito, Cartão de Débito, Pix
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. tabela de itens do pedido (O detalhe do pedido)
CREATE TABLE itens_pedido(
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL -- Preço fixado no momento da compra
)