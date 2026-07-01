const btn = document.getElementById("btn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  status.className = "";
  status.textContent = "Processando imagens...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.tabs.sendMessage(tab.id, { acao: "processar" });

    status.className = "ok";
    status.textContent = "Pronto! Verifique o console para detalhes.";
  } catch (e) {
    status.className = "erro";
    status.textContent = "Erro: recarregue a página e tente novamente.";
  } finally {
    btn.disabled = false;
  }
});