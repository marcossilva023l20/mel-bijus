console.log('Script loaded');

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyB4g-yt06WapPopVHJgAcUuJadaLXef8Q8",
  authDomain: "mel-bijus-618f5.firebaseapp.com",
  projectId: "mel-bijus-618f5",
  storageBucket: "mel-bijus-618f5.firebasestorage.app",
  messagingSenderId: "80695474679",
  appId: "1:80695474679:web:191f4a70ed39a856fe96f2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');
    const tabelaCorpo = document.getElementById('corpo-tabela');
    const tabelaMovCorpo = document.getElementById('corpo-movimentacoes');
    const btnAdicionar = document.getElementById('btn-adicionar');
    const formulario = document.getElementById('formulario');
    const tituloForm = document.getElementById('titulo-form');
    const formProduto = document.getElementById('form-produto');
    const btnCancelar = document.getElementById('btn-cancelar');
    const idProduto = document.getElementById('id-produto');

    const formularioMov = document.getElementById('formulario-mov');
    const tituloFormMov = document.getElementById('titulo-form-mov');
    const formMov = document.getElementById('form-mov');
    const btnCancelarMov = document.getElementById('btn-cancelar-mov');
    const produtoMov = document.getElementById('produto-mov');

    let produtos = [];
    let movimentacoes = [];

    async function carregarProdutos() {
        try {
            const q = query(collection(db, 'produtos'), orderBy('nome'));
            const querySnapshot = await getDocs(q);
            produtos = [];
            querySnapshot.forEach((doc) => {
                produtos.push({ id: doc.id, ...doc.data() });
            });
            atualizarTabela();
            atualizarResumo();
            atualizarOpcoesMov();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    async function salvarProduto(produto) {
        try {
            if (produto.id) {
                await setDoc(doc(db, 'produtos', produto.id), produto);
            } else {
                const newDocRef = doc(collection(db, 'produtos'));
                produto.id = newDocRef.id;
                await setDoc(newDocRef, produto);
            }
            await carregarProdutos();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto: ' + error.message);
        }
    }

    async function excluirProduto(id) {
        try {
            await deleteDoc(doc(db, 'produtos', id));
            await carregarProdutos();
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            alert('Erro ao excluir produto: ' + error.message);
        }
    }

    async function carregarMovimentacoes() {
        try {
            const q = query(collection(db, 'movimentacoes'), orderBy('data', 'desc'));
            const querySnapshot = await getDocs(q);
            movimentacoes = [];
            querySnapshot.forEach((doc) => {
                movimentacoes.push({ id: doc.id, ...doc.data() });
            });
            atualizarTabelaMov();
            atualizarResumo();
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
        }
    }

    async function salvarMovimentacao(mov) {
        try {
            const newDocRef = doc(collection(db, 'movimentacoes'));
            mov.id = newDocRef.id;
            mov.data = new Date().toISOString();
            await setDoc(newDocRef, mov);
            await carregarMovimentacoes();
            await carregarProdutos(); // Para atualizar quantidades
        } catch (error) {
            console.error('Erro ao salvar movimentação:', error);
            alert('Erro ao salvar movimentação: ' + error.message);
        }
    }

    async function cancelarMovimentacao(id) {
        try {
            const mov = movimentacoes.find(m => m.id === id);
            if (mov) {
                const produto = produtos.find(p => p.id === mov.produtoId);
                if (produto) {
                    if (mov.tipo === 'entrada') {
                        produto.quantidade -= mov.quantidade;
                    } else {
                        produto.quantidade += mov.quantidade;
                    }
                    await salvarProduto(produto);
                }
            }
            await deleteDoc(doc(db, 'movimentacoes', id));
            await carregarMovimentacoes();
        } catch (error) {
            console.error('Erro ao cancelar movimentação:', error);
            alert('Erro ao cancelar movimentação: ' + error.message);
        }
    }

    function atualizarTabela() {
        tabelaCorpo.innerHTML = '';
        produtos.forEach(produto => {
            const custo = (produto.valorCompra * (1 - produto.desconto / 100)) + (produto.gastosMaterial + produto.gastosFrete);
            const lucro = produto.precoVenda - custo;
            const porcentagemLucro = custo > 0 ? ((lucro / custo) * 100).toFixed(2) : 0;

            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${produto.nome}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${custo.toFixed(2)}</td>
                <td>R$ ${produto.precoVenda.toFixed(2)}</td>
                <td>R$ ${lucro.toFixed(2)}</td>
                <td>${porcentagemLucro}%</td>
                <td>
                    <button onclick="editarProduto('${produto.id}')">Editar</button>
                    <button onclick="movimentarProduto('${produto.id}')">Entrada/Saída</button>
                    <button onclick="excluirProduto('${produto.id}')">Excluir</button>
                </td>
            `;
            tabelaCorpo.appendChild(linha);
        });
    }

    function atualizarTabelaMov() {
        tabelaMovCorpo.innerHTML = '';
        movimentacoes.forEach(mov => {
            const produto = produtos.find(p => p.id === mov.produtoId);
            const nomeProduto = produto ? produto.nome : 'Produto não encontrado';
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${nomeProduto}</td>
                <td>${mov.tipo}</td>
                <td>${mov.quantidade}</td>
                <td>${new Date(mov.data).toLocaleString()}</td>
                <td>
                    <button onclick="cancelarMovimentacao('${mov.id}')">Cancelar ${mov.tipo}</button>
                </td>
            `;
            tabelaMovCorpo.appendChild(linha);
        });
    }

    function atualizarResumo() {
        let vendaTotal = 0;
        let custoTotal = 0;
        let totalMaterial = 0;
        let totalFrete = 0;
        let totalCompra = 0;
        let totalDesconto = 0;
        let vendasFeitas = 0;
        let totalEstoque = 0;

        produtos.forEach(produto => {
            const custo = (produto.valorCompra * (1 - produto.desconto / 100)) + (produto.gastosMaterial + produto.gastosFrete);
            vendaTotal += produto.precoVenda * produto.quantidade;
            custoTotal += custo * produto.quantidade;
            totalMaterial += produto.gastosMaterial * produto.quantidade;
            totalFrete += produto.gastosFrete * produto.quantidade;
            totalCompra += produto.valorCompra * produto.quantidade;
            totalDesconto += (produto.valorCompra * produto.desconto / 100) * produto.quantidade;
            totalEstoque += produto.quantidade;
        });

        movimentacoes.filter(m => m.tipo === 'saida').forEach(mov => {
            const produto = produtos.find(p => p.id === mov.produtoId);
            if (produto) {
                vendasFeitas += produto.precoVenda * mov.quantidade;
            }
        });

        const lucroEsperado = vendaTotal - custoTotal;

        document.getElementById('venda-total').textContent = vendaTotal.toFixed(2);
        document.getElementById('custo-total').textContent = custoTotal.toFixed(2);
        document.getElementById('total-material').textContent = totalMaterial.toFixed(2);
        document.getElementById('total-frete').textContent = totalFrete.toFixed(2);
        document.getElementById('total-compra').textContent = totalCompra.toFixed(2);
        document.getElementById('total-desconto').textContent = totalDesconto.toFixed(2);
        document.getElementById('lucro-esperado').textContent = lucroEsperado.toFixed(2);
        document.getElementById('vendas-feitas').textContent = vendasFeitas.toFixed(2);
        document.getElementById('total-estoque').textContent = totalEstoque;
    }

    function atualizarOpcoesMov() {
        produtoMov.innerHTML = '';
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = produto.nome;
            produtoMov.appendChild(option);
        });
    }

    window.editarProduto = function(id) {
        const produto = produtos.find(p => p.id === id);
        if (produto) {
            document.getElementById('nome').value = produto.nome;
            document.getElementById('valor-compra').value = produto.valorCompra;
            document.getElementById('desconto').value = produto.desconto;
            document.getElementById('gastos-material').value = produto.gastosMaterial;
            document.getElementById('gastos-frete').value = produto.gastosFrete;
            document.getElementById('quantidade').value = produto.quantidade;
            document.getElementById('preco-venda').value = produto.precoVenda;
            idProduto.value = produto.id;
            tituloForm.textContent = 'Editar Produto';
            formulario.style.display = 'block';
        }
    };

    window.movimentarProduto = function(id) {
        produtoMov.value = id;
        tituloFormMov.textContent = 'Adicionar Movimentação';
        formularioMov.style.display = 'block';
    };

    window.excluirProduto = async function(id) {
        await excluirProduto(id);
    };

    window.cancelarMovimentacao = async function(id) {
        await cancelarMovimentacao(id);
    };

    btnAdicionar.addEventListener('click', function() {
        console.log('Button adicionar clicked');
        formProduto.reset();
        idProduto.value = '';
        tituloForm.textContent = 'Adicionar Produto';
        formulario.style.display = 'block';
    });

    btnCancelar.addEventListener('click', function() {
        formulario.style.display = 'none';
    });

    formProduto.addEventListener('submit', async function(e) {
        e.preventDefault();
        const produto = {
            nome: document.getElementById('nome').value,
            valorCompra: parseFloat(document.getElementById('valor-compra').value),
            desconto: parseFloat(document.getElementById('desconto').value),
            gastosMaterial: parseFloat(document.getElementById('gastos-material').value),
            gastosFrete: parseFloat(document.getElementById('gastos-frete').value),
            quantidade: parseInt(document.getElementById('quantidade').value),
            precoVenda: parseFloat(document.getElementById('preco-venda').value)
        };
        if (idProduto.value) {
            produto.id = idProduto.value;
        }
        await salvarProduto(produto);
        formulario.style.display = 'none';
    });

    formMov.addEventListener('submit', async function(e) {
        e.preventDefault();
        const mov = {
            produtoId: produtoMov.value,
            tipo: document.getElementById('tipo-mov').value,
            quantidade: parseInt(document.getElementById('quantidade-mov').value)
        };
        const produto = produtos.find(p => p.id === mov.produtoId);
        if (produto) {
            if (mov.tipo === 'entrada') {
                produto.quantidade += mov.quantidade;
            } else {
                produto.quantidade -= mov.quantidade;
            }
            await salvarProduto(produto);
            await salvarMovimentacao(mov);
        }
        formularioMov.style.display = 'none';
    });

    btnCancelarMov.addEventListener('click', function() {
        formularioMov.style.display = 'none';
    });

    // Carregar dados iniciais
    carregarProdutos();
    carregarMovimentacoes();
});
