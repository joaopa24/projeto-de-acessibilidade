chrome.commands.onCommand.addListener((comando) => {
  if (comando === "processar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { acao: "processar" });
      }
    });
  }
});