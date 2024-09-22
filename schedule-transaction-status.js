let countdownInterval;

window.addEventListener('message', (event) => {
  console.log("Received message: ", event.data);  // Log message for debugging

  const statusElem = document.getElementById('status');
  const countdownElem = document.getElementById('countdown');
  const timeRemainingElem = document.getElementById('timeRemaining');
  const cancelButton = document.getElementById('cancelTransaction');

  if (event.data.action === 'waiting') {
    const scheduledTime = new Date(event.data.scheduledTime);

    countdownInterval = setInterval(() => {
      const now = new Date();  
      const timeRemaining = (scheduledTime - now) / 1000;  

      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        countdownElem.innerText = 'Transaction sending now!';
      } else {
        countdownElem.innerText = `Time Remaining: ${timeRemaining.toFixed(1)} seconds`;
        statusElem.innerText = `Current Time: ${now.toLocaleTimeString()} | Scheduled Time: ${scheduledTime.toLocaleTimeString()}`;
      }
    }, 100);  
  } else if (event.data.action === 'sendingTransaction') {
    statusElem.innerText = 'Sending transaction...';
    cancelButton.style.display = 'none';  // Hide the cancel button
  } else if (event.data.action === 'transactionComplete') {
    console.log("Transaction complete event received: ", event.data);  // Log completion for debugging
    statusElem.innerText = `Transaction complete! \n\n TX Hash: ${event.data.receipt.transactionHash}`;

    // Create the "View on Scan Site" link
    const link = document.createElement('a');
    link.href = event.data.scanUrl;
    link.textContent = 'View on Scan Site';
    link.target = '_blank';

    // Create a container for placing the link above the cancel button
    const linkContainer = document.createElement('div');
    linkContainer.appendChild(link);

    // Insert the linkContainer above the Cancel button
    cancelButton.parentNode.insertBefore(linkContainer, cancelButton);

    // Clear the "Transaction sending now!" message after showing the TX hash
    countdownElem.innerText = '';  // Clear countdown message
    timeRemainingElem.style.display = 'none';  // Remove "Time remaining" section
  } else if (event.data.action === 'transactionError') {
    statusElem.innerText = `Transaction failed: ${event.data.error}`;
  }
});

document.getElementById('cancelTransaction').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'cancelTransaction' });
  clearInterval(countdownInterval);  
  window.close();  
});
