const OPENAI_API_KEY = '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'; // ← Pon tu clave real aquí
let nombre = 'fer'
console.log(nombre);
console.warn(nombre);
console.error(nombre);

const chatContainer = document.getElementById('chat');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
let chatHistory = [];

//const OPENAI_API_KEY = 'TU_API_KEY_AQUI';

// Función para sanitizar y formatear el texto del bot
function formatMessage(text) {
  // Primero separamos bloques de código con regex
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let index = 0;

  // Extraemos y reemplazamos por marcador temporal
  const textWithoutCode = text.replace(codeBlockRegex, (match, lang, code) => {
    codeBlocks.push({
      lang: lang || 'plaintext',
      code: code
    });
    return `[[CODEBLOCK_${index++}]]`;
  });

  // Formateamos el texto restante (sin alterar bloques de código)
  let formatted = textWithoutCode
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>') // ahora sí, solo fuera del bloque
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

  // Reinsertamos los bloques de código reales
  codeBlocks.forEach((block, i) => {
    const cleanCode = block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const blockHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn">📋 Copiar</button>
        <pre><code class="language-${block.lang}">${cleanCode}</code></pre>
      </div>
    `;
    formatted = formatted.replace(`[[CODEBLOCK_${i}]]`, blockHTML);
  });

  return formatted;
}



// Agrega mensaje al chat
function appendMessage(text, className, isHTML = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', className);

  // Si es del bot, agregar botón copiar
  if (className === 'bot-message') {
    //Prism.highlightAll(); 
    hljs.highlightAll();
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('bot-content');
    contentDiv.innerHTML = isHTML ? formatMessage(text) : text;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copiar';
    copyBtn.style.marginTop = '10px';
    copyBtn.style.background = '#444';
    copyBtn.style.border = 'none';
    copyBtn.style.color = '#fff';
    copyBtn.style.padding = '5px 10px';
    copyBtn.style.borderRadius = '8px';
    copyBtn.style.cursor = 'pointer';

    copyBtn.addEventListener('click', () => {
      const tempText = document.createElement('textarea');
      tempText.value = contentDiv.textContent;
      document.body.appendChild(tempText);
      tempText.select();
      document.execCommand('copy');
      document.body.removeChild(tempText);
      copyBtn.textContent = '✅ Copiado';
      setTimeout(() => copyBtn.textContent = '📋 Copiar', 1500);
    });

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(copyBtn);
  } else {
    messageDiv.textContent = text;
  }

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  // Resaltar código
if (className === 'bot-message') {
  hljs.highlightAll();

  // Funcionalidad de copiar
  const copyButtons = messageDiv.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.nextElementSibling.querySelector('code').innerText;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✅ Copiado';
        setTimeout(() => {
          btn.textContent = '📋 Copiar';
        }, 1500);
      });
    });
  });
}

}

// Enviar mensaje a OpenAI
async function sendMessage(message) {
  appendMessage(message, "user-message")

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente útil y claro. Da siempre respuestas en formato Markdown completo:
- Usa **negritas** para resaltar ideas importantes
- Usa títulos con "#", "##", etc.
- Usa listas con "-" o "1."
- Agrega saltos de línea para separar ideas
- Agrega emojis solo en títulos o cuando lo creas apropiado
- SI es un codigo, y quieres explicarlo algo dentro del codigo, debes de utilizar los comentarios segun el lenguaje
-Ademas lee lo que se hay en chatHistory, ya que eso te ayudara estar en contexto y tendlo en tu memoria`
          },
          
          {
            role: 'user',
            content: message
          },
          ...chatHistory
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content.trim();

    chatHistory.push({
      role: 'assistant',
      content: reply + message
    });
    appendMessage(reply, 'bot-message', true);

  } catch (error) {
    appendMessage('❌ Error al contactar con el modelo', 'bot-message');
    console.error(error);
  }
}

// Eventos
sendBtn.addEventListener('click', () => {
  const message = input.value.trim();
  if (message) {
    sendMessage(message);
    input.value = '';
  }
});

input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

input.addEventListener('keydown', (e) => {
  // SHIFT + ENTER → salto de línea
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault(); // evita que se envíe
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.substring(0, start) + "\n" + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + 1;
  }

  // ENTER solo → enviar
  else if (e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  }
});
