const chat = document.getElementById('chat');
const form = document.getElementById('form');
const pergunta = document.getElementById('pergunta');
const enviar = document.getElementById('enviar');
const nova = document.getElementById('nova');
const listaConversas = document.getElementById('lista-conversas');

let historicoSidebar = [];
try {
  historicoSidebar = JSON.parse(localStorage.getItem('historico_conversas')) || [];
} catch (e) {
  historicoSidebar = [];
}

let conversa = localStorage.getItem('conversa');
if (!conversa) {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
}

function registrarConversa(id, titulo = 'Nova conversa') {
  const existente = historicoSidebar.find(c => c.id === id);
  if (!existente) {
    historicoSidebar.unshift({ id, titulo });
  } else if (existente.titulo === 'Nova conversa' && titulo !== 'Nova conversa') {
    existente.titulo = titulo;
  }
  localStorage.setItem('historico_conversas', JSON.stringify(historicoSidebar));
  renderizarSidebar();
}

function renderizarSidebar() {
  if (!listaConversas) return;
  listaConversas.innerHTML = '';

  for (const item of historicoSidebar) {
    const li = document.createElement('li');
    li.className = 'item-conversa' + (item.id === conversa ? ' ativa' : '');
    li.textContent = item.titulo;
    li.title = item.titulo;

    li.addEventListener('click', () => {
      if (conversa === item.id) return;
      conversa = item.id;
      localStorage.setItem('conversa', conversa);
      renderizarSidebar();
      carregarHistorico();
    });

    listaConversas.appendChild(li);
  }
}

function mostrar(classe, texto) {
  const div = document.createElement('div');
  div.className = classe;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

async function carregarHistorico() {
  chat.textContent = '';
  try {
    const resposta = await fetch('/historico/' + conversa);
    const mensagens = await resposta.json();
    if (!resposta.ok) throw new Error(mensagens.erro);

    for (const m of mensagens) {
      mostrar('msg ' + m.role, m.content);
    }

    const primeiraPergunta = mensagens.find(m => m.role === 'user');
    if (primeiraPergunta) {
      registrarConversa(conversa, primeiraPergunta.content);
    }
  } catch (erro) {
    mostrar('msg assistant', 'Erro ao carregar o histórico: ' + erro.message);
  }
}

// Botão de Nova Conversa
nova.addEventListener('click', () => {
  conversa = crypto.randomUUID();
  localStorage.setItem('conversa', conversa);
  chat.textContent = '';
  registrarConversa(conversa, 'Nova conversa');
  pergunta.focus();
});

// Envio de mensagem
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const texto = pergunta.value.trim();
  if (!texto) return;

  registrarConversa(conversa, texto);

  mostrar('msg user', texto);
  pergunta.value = '';
  enviar.disabled = true;
  const balao = mostrar('msg assistant', 'Pensando...');

  try {
    const resposta = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversa: conversa, texto: texto })
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro);

    balao.textContent = dados.resposta;
    if (dados.ferramentas && dados.ferramentas.length > 0) {
      mostrar('ferramentas', 'Consultou: ' + dados.ferramentas.join(', '));
    }
  } catch (erro) {
    balao.textContent = 'Erro: ' + erro.message;
  }
  enviar.disabled = false;
  pergunta.focus();
});

// Inicia a página
registrarConversa(conversa);
carregarHistorico();