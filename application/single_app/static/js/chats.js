// Global variables
let currentConversationId = null;

// Function to load all conversations
function loadConversations() {
  fetch("/api/get_conversations")
    .then((response) => response.json())
    .then((data) => {
      const conversationsList = document.getElementById("conversations-list");
      conversationsList.innerHTML = ""; // Clear existing list
      data.conversations.forEach((convo) => {
        const convoItem = document.createElement("div");
        convoItem.classList.add("list-group-item", "conversation-item");
        convoItem.setAttribute("data-conversation-id", convo.id);
        convoItem.setAttribute("data-conversation-title", convo.title); // Add this line
        const date = new Date(convo.last_updated);
        convoItem.innerHTML = `
                      <div class="d-flex justify-content-between align-items-center">
                          <div>
                              <span>${
                                convo.title
                              }</span><br> <!-- Use convo.title here -->
                              <small>${date.toLocaleString()}</small>
                          </div>
                          <button class="btn btn-danger btn-sm delete-btn" data-conversation-id="${
                            convo.id
                          }">
                              <i class="bi bi-trash"></i>
                          </button>
                      </div>
                  `;
        conversationsList.appendChild(convoItem);
      });
    })
    .catch((error) => {
      console.error("Error loading conversations:", error);
    });
}

// Toggle the active class on the button when clicked
document
  .getElementById("search-documents-btn")
  .addEventListener("click", function () {
    this.classList.toggle("active");
    const documentSelect = document.getElementById("document-select");
    if (this.classList.contains("active")) {
        documentSelect.style.display = "block";
        loadDocuments();
    } else {
        documentSelect.style.display = "none";
    }
  });

// Toggle the active class on the button when clicked
document
  .getElementById("search-web-btn")
  .addEventListener("click", function () {
    this.classList.toggle("active");
  });

// Toggle the active class on the image generation button
document
  .getElementById("image-generate-btn")
  ?.addEventListener("click", function () {
    // Toggle on/off
    this.classList.toggle("active");
    
    // Check if Image Generation is active
    const isImageGenEnabled = this.classList.contains("active");

    // Grab the two existing search buttons
    const docBtn = document.getElementById("search-documents-btn");
    const webBtn = document.getElementById("search-web-btn");
    const fileBtn = document.getElementById("choose-file-btn");
    const documentSelectionContainer = document.getElementById("document-selection-container");

    // If image generation is enabled, disable the search buttons
    if (isImageGenEnabled) {
      docBtn.disabled = true;
      webBtn.disabled = true;
      fileBtn.disabled = true;
      docBtn.classList.remove("active");
      webBtn.classList.remove("active");
      fileBtn.classList.remove("active");
      documentSelectionContainer.style.display = "none";
    } else {
      // Otherwise, re-enable them
      docBtn.disabled = false;
      webBtn.disabled = false;
      fileBtn.disabled = false;
    }
  });

// Function to select a conversation
function selectConversation(conversationId) {
  currentConversationId = conversationId;
  document.getElementById("user-input").disabled = false;
  document.getElementById("send-btn").disabled = false;
  // Get the conversation title
  const convoItem = document.querySelector(
    `.conversation-item[data-conversation-id="${conversationId}"]`
  );
  const conversationTitle = convoItem
    ? convoItem.getAttribute("data-conversation-title")
    : "Conversation";
  document.getElementById("current-conversation-title").textContent =
    conversationTitle;
  loadMessages(conversationId);
  highlightSelectedConversation(conversationId);
}

// Function to highlight the selected conversation
function highlightSelectedConversation(conversationId) {
  const items = document.querySelectorAll(".conversation-item");
  items.forEach((item) => {
    if (item.getAttribute("data-conversation-id") === conversationId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// Function to append a message to the chatbox
function appendMessage(sender, messageContent) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("mb-2");

  // Declare variables at the top
  let avatarImg = "";
  let messageClass = "";
  let senderLabel = "";
  let messageContentHtml = "";

  if (sender === "System") {
    // Skip rendering system messages
    return;
  }

  if (sender === "image") {
    // Treat it as an AI-style message but replace the text with an <img> tag
    messageClass = "ai-message";
    senderLabel = "AI";
    avatarImg = "/static/images/ai-avatar.png";
  
    // Create an image at 25% size; set a data attribute so we can capture clicks and open a modal
    const imageHtml = `
      <img 
        src="${messageContent}" 
        alt="Generated Image" 
        class="generated-image" 
        style="width: 25%; cursor: pointer;" 
        data-image-src="${messageContent}" 
      />
    `;
  
    messageContentHtml = imageHtml;
  } else if (sender === "You") {
    messageClass = "user-message";
    senderLabel = "You";
    avatarImg = "/static/images/user-avatar.png";

    // Optionally, parse and sanitize user messages if they contain Markdown
    const sanitizedContent = DOMPurify.sanitize(marked.parse(messageContent));
    messageContentHtml = sanitizedContent;
  } else if (sender === "AI") {
    messageClass = "ai-message";
    senderLabel = "AI";
    avatarImg = "/static/images/ai-avatar.png";

    // Clean up message content
    let cleanedMessage = messageContent.trim();
    cleanedMessage = cleanedMessage.replace(/\n{3,}/g, "\n\n");
    // Parse message to convert citations into links
    const parsedMessage = parseCitations(cleanedMessage);
    // Parse Markdown and sanitize the output
    const htmlContent = DOMPurify.sanitize(marked.parse(parsedMessage));
    messageContentHtml = htmlContent;
  } else if (sender === "File") {
    messageClass = "file-message";
    senderLabel = "File Added";

    // messageContent is the message object
    const filename = messageContent.filename;
    const fileId = messageContent.file_id;
    messageContentHtml = `<a href="#" class="file-link" data-conversation-id="${currentConversationId}" data-file-id="${fileId}">${filename}</a>`;
  }

  // Build the message bubble
  messageDiv.classList.add("message", messageClass);
  messageDiv.innerHTML = `
      <div class="message-content ${
        sender === "You" || sender === "File" ? "flex-row-reverse" : ""
      }">
          ${
            sender !== "File"
              ? `<img src="${avatarImg}" alt="${senderLabel}" class="avatar">`
              : ""
          }
          <div class="message-bubble">
              <div class="message-sender">${senderLabel}</div>
              <div class="message-text">${messageContentHtml}</div>
          </div>
      </div>
  `;

  document.getElementById("chatbox").appendChild(messageDiv);
  // Scroll to the bottom
  document.getElementById("chatbox").scrollTop =
    document.getElementById("chatbox").scrollHeight;
}

// Function to load messages for a conversation
function loadMessages(conversationId) {
  fetch(`/conversation/${conversationId}/messages`)
    .then((response) => response.json())
    .then((data) => {
      const chatbox = document.getElementById("chatbox");
      chatbox.innerHTML = ""; // Clear existing messages
      data.messages.forEach((msg) => {
        if (msg.role === "user") {
          appendMessage("You", msg.content);
        } else if (msg.role === "assistant") {
          appendMessage("AI", msg.content);
        } else if (msg.role === "file") {
          appendMessage("File", msg);
        } else if (msg.role === "image") {
          appendMessage("image", msg.content);
        }
      });
    })
    .catch((error) => {
      console.error("Error loading messages:", error);
    });
}

// Function to parse citations and convert them into clickable links
function parseCitations(message) {
    // Regular expression to match citations in the format:
    // (Source: filename, Pages: page number) [#ID]
    // (Source: filename, Pages: page number-page number) [#ID] [#ID] [#ID]
    // (Source: filename, Pages: page number–page number) [#ID], [#ID], and [#ID]
    const citationRegex = /\(Source: ([^,]+), Page(?:s)?: ([^)]+)\)([^]*)/g;

    // Replace citations with links
    const parsedMessage = message.replace(citationRegex, (match, filename, pages, ids) => {
        const pageRange = pages.trim();
        const idMatches = ids.match(/\[#([^\]]+)\]/g);
        if (!idMatches) return match;

        const citationLinks = idMatches.map(idMatch => {
            const citationId = idMatch.slice(2, -1); // Remove [# and ]
            const pageNumber = citationId.split('_').pop(); // Extract the page number
            return `<a href="#" class="citation-link" data-citation-id="${citationId}">[Page ${pageNumber}]</a>`;
        }).join(', ');

        return `(Source: ${filename}, Pages: ${pageRange}) ${citationLinks}`;
    });

    return parsedMessage;
}

// Event delegation to handle clicks on conversation items and delete buttons
document
  .getElementById("conversations-list")
  .addEventListener("click", (event) => {
    const deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
      event.stopPropagation();
      const conversationId = deleteBtn.getAttribute("data-conversation-id");
      deleteConversation(conversationId);
    } else {
      const convoItem = event.target.closest(".conversation-item");
      if (convoItem) {
        const conversationId = convoItem.getAttribute("data-conversation-id");
        selectConversation(conversationId);
      }
    }
  });

// Function to delete a conversation
function deleteConversation(conversationId) {
  if (confirm("Are you sure you want to delete this conversation?")) {
    fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Remove the conversation from the list
          const convoItem = document.querySelector(
            `.conversation-item[data-conversation-id="${conversationId}"]`
          );
          if (convoItem) {
            convoItem.remove();
          }
          // If the deleted conversation was selected, clear the chatbox
          if (currentConversationId === conversationId) {
            currentConversationId = null;
            document.getElementById("user-input").disabled = true;
            document.getElementById("send-btn").disabled = true;
            document.getElementById(
              "current-conversation-title"
            ).textContent = "Select a conversation";
            document.getElementById("chatbox").innerHTML = "";
          }
        } else {
          alert("Failed to delete the conversation.");
        }
      })
      .catch((error) => {
        console.error("Error deleting conversation:", error);
        alert("Error deleting the conversation.");
      });
  }
}

// Function to fetch cited text from the backend
function fetchCitedText(citationId) {
  // Show loading indicator
  showLoadingIndicator();

  fetch("/api/get_citation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citation_id: citationId }),
  })
    .then((response) => response.json())
    .then((data) => {
      hideLoadingIndicator();

      if (
        data.cited_text &&
        data.file_name &&
        data.page_number !== undefined
      ) {
        // Display the cited text in a popup or sidebar with dynamic title
        showCitedTextPopup(data.cited_text, data.file_name, data.page_number);
      } else if (data.error) {
        alert(data.error);
      } else {
        alert("Unexpected response from server.");
      }
    })
    .catch((error) => {
      hideLoadingIndicator();
      console.error("Error fetching cited text:", error);
      alert("Error fetching cited text.");
    });
}

// Function to display cited text in a Bootstrap modal with dynamic title
function showCitedTextPopup(citedText, fileName, pageNumber) {
  // Create the modal container if it doesn't exist
  let modalContainer = document.getElementById("citation-modal");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "citation-modal";
    modalContainer.classList.add("modal", "fade");
    modalContainer.tabIndex = -1;
    modalContainer.setAttribute("aria-hidden", "true");

    modalContainer.innerHTML = `
              <div class="modal-dialog modal-dialog-scrollable modal-xl modal-fullscreen-sm-down">
                  <div class="modal-content">
                      <div class="modal-header">
                          <h5 class="modal-title">Source: ${fileName}, Page: ${pageNumber}</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div class="modal-body">
                          <pre id="cited-text-content"></pre>
                      </div>
                  </div>
              </div>
          `;
    document.body.appendChild(modalContainer);
  } else {
    // Update the modal title if it already exists
    const modalTitle = modalContainer.querySelector(".modal-title");
    modalTitle.textContent = `Source: ${fileName}, Page: ${pageNumber}`;
  }

  // Set the cited text content
  const citedTextContent = document.getElementById("cited-text-content");
  citedTextContent.textContent = citedText;

  // Show the modal using Bootstrap's modal plugin
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
}

// Function to show loading indicator
function showLoadingIndicator() {
  // Create a loading spinner if it doesn't exist
  let loadingSpinner = document.getElementById("loading-spinner");
  if (!loadingSpinner) {
    loadingSpinner = document.createElement("div");
    loadingSpinner.id = "loading-spinner";
    loadingSpinner.innerHTML = `
              <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
              </div>
          `;
    loadingSpinner.style.position = "fixed";
    loadingSpinner.style.top = "50%";
    loadingSpinner.style.left = "50%";
    loadingSpinner.style.transform = "translate(-50%, -50%)";
    loadingSpinner.style.zIndex = "1050";
    document.body.appendChild(loadingSpinner);
  } else {
    loadingSpinner.style.display = "block";
  }
}

// Function to hide loading indicator
function hideLoadingIndicator() {
  const loadingSpinner = document.getElementById("loading-spinner");
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
}

// Function to send a message (user input)
function sendMessage() {
  const userInput = document.getElementById("user-input").value.trim();
  if (userInput === "" || !currentConversationId) return;

  appendMessage("You", userInput);
  document.getElementById("user-input").value = "";

  // Show the loading indicator
  showLoadingIndicatorInChatbox();

  // Get the state of the search documents button
  const hybridSearchEnabled = document
    .getElementById("search-documents-btn")
    ?.classList.contains("active") || false;

  // Get the selected document ID if hybrid search is enabled
  const selectedDocumentId = (hybridSearchEnabled && (document.getElementById("document-select").value != "None")) ? document.getElementById("document-select").value : null;

  // Get the state of the search web button
  const bingSearchEnabled = document
    .getElementById("search-web-btn")
    ?.classList.contains("active") || false;

  // Get the state of the image generation button
  const imageGenEnabled = document
    .getElementById("image-generate-btn")
    ?.classList.contains("active") || false;

  fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: userInput,
      conversation_id: currentConversationId,
      hybrid_search: hybridSearchEnabled,
      selected_document_id: selectedDocumentId, // Include selected document ID
      bing_search: bingSearchEnabled,
      image_generation: imageGenEnabled
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // Hide the loading indicator
      hideLoadingIndicatorInChatbox();

      if (data.reply) {
        appendMessage("AI", data.reply);
      }
      if (data.conversation_id) {
        currentConversationId = data.conversation_id; // Update conversation ID if needed
      }
      if (data.conversation_title) {
        // Update the conversation title in the UI
        document.getElementById("current-conversation-title").textContent =
          data.conversation_title;
        // Update the conversation item in the list
        const convoItem = document.querySelector(
          `.conversation-item[data-conversation-id="${currentConversationId}"]`
        );
        if (convoItem) {
          const date = new Date();
          convoItem.innerHTML = `
                      <div class="d-flex justify-content-between align-items-center">
                          <div>
                              <span>${data.conversation_title}</span><br>
                              <small>${date.toLocaleString()}</small>
                          </div>
                          <button class="btn btn-danger btn-sm delete-btn" data-conversation-id="${currentConversationId}">
                              <i class="bi bi-trash"></i>
                          </button>
                      </div>
                  `;
          // Update the data-conversation-title attribute
          convoItem.setAttribute(
            "data-conversation-title",
            data.conversation_title
          );
        }
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      // Hide the loading indicator even if there's an error
      hideLoadingIndicatorInChatbox();
      appendMessage("Error", "Could not get a response.");
    });
}

// Function to load documents for the dropdown
function loadDocuments() {
  fetch("/api/documents")
    .then(response => response.json())
    .then(data => {
      const documentSelect = document.getElementById("document-select");
      documentSelect.innerHTML = "";

      // Add a "None" default
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "None";
      documentSelect.appendChild(defaultOption);

      data.documents.forEach(doc => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.file_name; 
        documentSelect.appendChild(option);
      });

      // Check URL parameters to pre-select document and enable search
      const searchDocuments = getUrlParameter('search_documents') === 'true';
      const documentId = getUrlParameter('document_id');
      if (searchDocuments && documentId) {
        document.getElementById("search-documents-btn").classList.add("active");
        documentSelect.style.display = "block";
        documentSelect.value = documentId;
      }
    })
    .catch(error => {
      console.error("Error loading documents:", error);
    });
}

// Function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Event listener for send button
document.getElementById("send-btn").addEventListener("click", sendMessage);

// Event listener for Enter key
document
  .getElementById("user-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

// Event listener for New Conversation button
document
  .getElementById("new-conversation-btn")
  .addEventListener("click", () => {
    fetch("/api/create_conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin", // Include cookies for same-origin requests
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((errData) => {
            throw new Error(errData.error || "Failed to create conversation");
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.conversation_id) {
          // Automatically select the new conversation
          selectConversation(data.conversation_id);
          // Optionally, add it to the top of the conversations list
          const conversationsList =
            document.getElementById("conversations-list");
          const convoItem = document.createElement("div");
          convoItem.classList.add(
            "list-group-item",
            "conversation-item",
            "active"
          );
          convoItem.setAttribute(
            "data-conversation-id",
            data.conversation_id
          );
          const date = new Date();
          convoItem.innerHTML = `
              <div class="d-flex justify-content-between align-items-center">
                  <div>
                      <span>${data.conversation_id}</span><br>
                      <small>${date.toLocaleString()}</small>
                  </div>
                  <button class="btn btn-danger btn-sm delete-btn" data-conversation-id="${
                    data.conversation_id
                  }">
                      <i class="bi bi-trash"></i>
                  </button>
              </div>
          `;
          // Prepend the new conversation
          conversationsList.prepend(convoItem);
          // Disable active state for others
          const items = document.querySelectorAll(".conversation-item");
          items.forEach((item) => {
            if (
              item.getAttribute("data-conversation-id") !==
              data.conversation_id
            ) {
              item.classList.remove("active");
            }
          });
        } else {
          throw new Error("Conversation ID not received");
        }
      })
      .catch((error) => {
        console.error("Error creating new conversation:", error);
        alert(`Failed to create a new conversation: ${error.message}`);
      });
  });

// Event listener for 'choose-file-btn' click
document
  .getElementById("choose-file-btn")
  .addEventListener("click", function () {
    // Trigger the file input click
    document.getElementById("file-input").click();
  });

// Event listener for 'file-input' change
document.getElementById("file-input").addEventListener("change", function () {
  const fileInput = this;
  const file = fileInput.files[0];
  if (file) {
    // Get the file name
    const fileName = file.name;
    // Update the button to display the file name
    const fileBtn = document.getElementById("choose-file-btn");
    fileBtn.classList.add("active");
    fileBtn.querySelector(".file-btn-text").textContent = fileName;
    // Show the upload button
    document.getElementById("upload-btn").style.display = "block";
  } else {
    // No file selected, reset the button
    resetFileButton();
  }
});

// Function to reset the file button
function resetFileButton() {
  // Clear the file input
  document.getElementById("file-input").value = "";
  // Reset the button
  const fileBtn = document.getElementById("choose-file-btn");
  fileBtn.classList.remove("active");
  fileBtn.querySelector(".file-btn-text").textContent = "";
  // Hide the upload button
  document.getElementById("upload-btn").style.display = "none";
}

// Modify the upload button event listener
document.getElementById("upload-btn").addEventListener("click", () => {
  const fileInput = document.getElementById("file-input");
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file to upload.");
    return;
  }
  if (!currentConversationId) {
    alert("Please select or start a conversation before uploading a file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("conversation_id", currentConversationId);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      // Clone the response to read the JSON body
      let clonedResponse = response.clone();
      return response.json().then((data) => {
        if (!response.ok) {
          // Handle HTTP errors
          console.error("Upload failed:", data.error || "Unknown error");
          alert("Error uploading file: " + (data.error || "Unknown error"));
          throw new Error(data.error || "Upload failed");
        }
        return data;
      });
    })
    .then((data) => {
      console.log("Upload response data:", data);
      if (data.conversation_id) {
        currentConversationId = data.conversation_id; // Update conversation ID
        loadMessages(currentConversationId); // Fetch and display updated conversation
      } else {
        console.error("No conversation_id returned from server.");
        alert("Error: No conversation ID returned from server.");
      }
      // Reset the file input and button
      resetFileButton();
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error uploading file: " + error.message);
      // Reset the file input and button
      resetFileButton();
    });
});

// Event delegation to handle clicks on citation links and file links
document.getElementById("chatbox").addEventListener("click", (event) => {
  if (event.target && event.target.matches("a.citation-link")) {
    event.preventDefault();
    const citationId = event.target.getAttribute("data-citation-id");
    fetchCitedText(citationId);
  } else if (event.target && event.target.matches("a.file-link")) {
    event.preventDefault();
    const fileId = event.target.getAttribute("data-file-id");
    const conversationId = event.target.getAttribute("data-conversation-id");
    fetchFileContent(conversationId, fileId);
  }
});

// Listen for clicks on any images with the 'generated-image' class
document.getElementById("chatbox").addEventListener("click", (event) => {
  if (event.target.classList.contains("generated-image")) {
    const imageSrc = event.target.getAttribute("data-image-src");
    showImagePopup(imageSrc);
  }
});

function showImagePopup(imageSrc) {
  let modalContainer = document.getElementById("image-modal");
  
  // If the modal doesn't exist yet, create it
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "image-modal";
    modalContainer.classList.add("modal", "fade");
    modalContainer.tabIndex = -1;
    modalContainer.setAttribute("aria-hidden", "true");

    modalContainer.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body text-center">
            <img id="image-modal-img" src="" alt="Generated Image" class="img-fluid" />
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);
  }

  // Update the src for the image inside the modal
  const modalImage = modalContainer.querySelector("#image-modal-img");
  modalImage.src = imageSrc;

  // Show the modal using Bootstrap
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
}

function fetchFileContent(conversationId, fileId) {
  // Show loading indicator
  showLoadingIndicator();

  fetch("/api/get_file_content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      file_id: fileId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      hideLoadingIndicator();

      if (data.file_content && data.filename) {
        // Display the file content in a popup or sidebar with dynamic title
        showFileContentPopup(data.file_content, data.filename, data.is_table);
      } else if (data.error) {
        alert(data.error);
      } else {
        alert("Unexpected response from server.");
      }
    })
    .catch((error) => {
      hideLoadingIndicator();
      console.error("Error fetching file content:", error);
      alert("Error fetching file content.");
    });
}

function showFileContentPopup(fileContent, filename, isTable) {
  // Create the modal container if it doesn't exist
  let modalContainer = document.getElementById("file-modal");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "file-modal";
    modalContainer.classList.add("modal", "fade");
    modalContainer.tabIndex = -1;
    modalContainer.setAttribute("aria-hidden", "true");

    modalContainer.innerHTML = `
          <div class="modal-dialog modal-dialog-scrollable modal-xl modal-fullscreen-sm-down">
              <div class="modal-content">
                  <div class="modal-header">
                      <h5 class="modal-title">Uploaded File: ${filename}</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                      <div id="file-content"></div>
                  </div>
              </div>
          </div>
      `;
    document.body.appendChild(modalContainer);
  } else {
    // Update the modal title if it already exists
    const modalTitle = modalContainer.querySelector(".modal-title");
    modalTitle.textContent = `Uploaded File: ${filename}`;
  }

  // Set the file content
  const fileContentElement = document.getElementById("file-content");
  if (isTable) {
    fileContentElement.innerHTML = `<div class="table-responsive">${fileContent}</div>`;
    // Initialize DataTables
    $(document).ready(function () {
      $("#file-content table").DataTable({
        responsive: true,
        scrollX: true, // Enable horizontal scrolling
      });
    });
  } else {
    fileContentElement.innerHTML = `<pre style="white-space: pre-wrap;">${fileContent}</pre>`;
  }

  // Show the modal using Bootstrap's modal plugin
  const modal = new bootstrap.Modal(modalContainer);
  modal.show();
}

function showLoadingIndicatorInChatbox() {
  const chatbox = document.getElementById("chatbox");

  // Create a loading indicator element
  const loadingIndicator = document.createElement("div");
  loadingIndicator.classList.add("loading-indicator");
  loadingIndicator.id = "loading-indicator"; // Assign an ID for easy reference

  // Use Bootstrap's spinner
  loadingIndicator.innerHTML = `
          <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">AI is typing...</span>
          </div>
          <span>AI is typing...</span>
      `;

  // Append the loading indicator to the chatbox
  chatbox.appendChild(loadingIndicator);

  // Scroll to the bottom to ensure the loading indicator is visible
  chatbox.scrollTop = chatbox.scrollHeight;
}

function hideLoadingIndicatorInChatbox() {
  const loadingIndicator = document.getElementById("loading-indicator");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Initialize Bootstrap tooltips
document.addEventListener("DOMContentLoaded", function () {
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Load conversations on page load
window.onload = function () {
  loadConversations();

  // Check URL parameters to enable search documents
  const searchDocuments = getUrlParameter('search_documents') === 'true';
  if (searchDocuments) {
    document.getElementById("search-documents-btn").classList.add("active");
    document.getElementById("document-select").style.display = "block";
    loadDocuments();
  }
};