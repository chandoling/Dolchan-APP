let transactionTimeout;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cancelTransaction') {
    if (transactionTimeout) {
      clearTimeout(transactionTimeout);
      console.log('Transaction canceled');
    }
  }
});
