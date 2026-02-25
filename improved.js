
// Player input in starting screen
const playerCountSelect = document.getElementById("playerCount");
const playerInputsDiv = document.getElementById("playerInputs");

// Buttons since they constantly need to be updated
const revealButton = document.getElementById("revealButton");
const chooseButton = document.getElementById("chooseCardButton");
const confirmButton = document.getElementById("confirmButton");
const laySpecialButton = document.getElementById("laySpecialCardButton");
const skipSpecialButton = document.getElementById("skipSpecialCardButton")
const stopButton = document.getElementById("stopButton");
const startNextRoundButton = document.getElementById("startNextRoundButton");
const restartButton = document.getElementById("restartButton")
const exitButton = document.getElementById("exitButton")

// Other elements that are often used
const deckCardImg = document.getElementById("deckCard");
const discardPileImg = document.getElementById("discardCard");
const deckCount = document.getElementById("deckCount");

let revealTime = 1000;

// Gamestate elements
const gameState = {
  turnCounter: 0,
  moveCounter: 0,
  currentRound: 1,
  phase: "reveal",
  swapSource: "",
  swapTarget: null,
  stopClicked: false
};

// Deck elements
let deck = [];
const deckDetails = {
  deck: [],
  selectedCards: [],
  maxSelectableCards: 2
}

// Player elements
const playerData = {
  colorClass: "",
  currentPlayerIndex: null,
  players: []
}

// Special character elements
const specialCardsState = {
  specialChars: ["a", "b", "c"],
  specialDrawCounter: 0,
  specialDrawPhase: "draw",
  allowSpecial: false
}


///////////////////////////
// Initialize the game   // 
///////////////////////////

// Run the code. Re-run whenever the value changes
updatePlayerInputs();
playerCountSelect.addEventListener("change", updatePlayerInputs);

// Starting game functions
function startGame() {
    // Collect player names
    playerData.players = getPlayerNames();
    
    // Randomly choose starting player
    playerData.currentPlayerIndex = Math.floor(Math.random() * playerData.players.length);

    // Update the name in the grid to the player names 
    document.getElementById("playerOneScoreName").textContent = playerData.players[0];
    document.getElementById("playerTwoScoreName").textContent = playerData.players[1];

    // Update header text
    initializeHeaderText(playerData.players);

    //Get the elements on the screen that we will update
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameUI").style.display = "flex";

    // Start the game by shuffling the deck, handing cards and make cards selectable
    setupDeck(playerData.players);
    updateSelectableCards();
}


///////////////////////////
// BUTTONS               // 
///////////////////////////

startNextRoundButton.addEventListener("click", () => {
  // Reset all variables
  chooseButton.disabled = true;

  gameState.turnCounter = 0;
  gameState.moveCounter = 0;
  gameState.phase = "reveal";
  gameState.stopClicked = false;
  gameState.currentRound++;
  
  // Reset / Empty the discard pile
  discardPileImg.src = "";
  discardPileImg.dataset.value = "";

  // Update header text and set deck again
  initializeHeaderText(playerData.players);
  setupDeck(playerData.players);
  
  // Show reveal button, 
  // Remove stop & start next round buttons
  toggleButtons([revealButton, stopButton, startNextRoundButton]);

  updateSelectableCards();
});

// Reveal button to turn around cards
revealButton.addEventListener("click", async () => {
  if (deckDetails.selectedCards.length !== deckDetails.maxSelectableCards) return;

  revealButton.disabled = true;
  disableCardClicks(true);

  // Reveal selected cards
  const flipPromises = deckDetails.selectedCards.map(card => {
    return flipCard(card, `images/card_${card.dataset.value}.JPG`);
  });

  // Await the completion of all flip animations
  await Promise.all(flipPromises);

  // Flip cards back
  deckDetails.selectedCards.forEach(card => {
    card.src = "images/Back.JPG";
    card.classList.remove("selected", "selectable");
  });
  deckDetails.selectedCards = [];

  // All players finished reveal phase, switch to draw phase
  if (gameState.moveCounter > 0) {
    gameState.phase = "draw";
    playerData.currentPlayerIndex ++;
    if(playerData.currentPlayerIndex > 1) {
        playerData.currentPlayerIndex = 0
    };
    gameState.moveCounter = 0;

    // Update header text and make the next card drawable
    initializeHeaderText();
    drawNextCard();
    toggleButtons([revealButton, chooseButton]);
  } else {
    // Set next player turn and let the next player see it's cards
    nextPlayerToReveal();
    updateSelectableCards();
  }
});

// Button to reveal the card 
chooseButton.addEventListener("click", async () => {
  chooseButton.disabled = true;
  disableCardClicks(true);
  let chosenCard = null;

  if (deckCardImg.classList.contains("selected")) {
    chosenCard = deck[0];
    deckCount.textContent = "";
    gameState.swapSource = "deck";

    // Flip the card
    await flipCard(deckCardImg, `images/card_${chosenCard}.JPG`);
    
    disableCardClicks(false);

    // Allow selecting hand cards and discard pile
    allowSwapTargetSelection(true);
    deckCount.textContent = deck.length;

    // Choose button is disabled, but confirm button enabled. Cannot stop the round now
    toggleButtons([chooseButton, confirmButton]);
    stopButton.disabled = true;
  } else if (discardPileImg.classList.contains("selected")) {
    gameState.swapSource = "discard";
    chosenCard = discardPileImg.dataset.value;

    // Only allow selecting hand card
    allowSwapTargetSelection(false);

    // Choose button is disabled, but confirm button enabled. Cannot stop the round now
    toggleButtons([chooseButton, confirmButton]);
    stopButton.disabled = true;
  }

  // On select does not do anything anymore
  deckCardImg.onclick = null;
  //discardPileImg.onclick = null;
});

confirmButton.addEventListener("click", async () => {
  confirmButton.disabled = true;
  
  // First move the actual card
  await moveNormalCard();

  // Clear selection styles and click listeners
  document.querySelectorAll(".card").forEach(c => {
    c.classList.remove("selectable", "selected");
    c.onclick = null;
  });

  // Then stop the round, game or make the next player move
  setupAfterLayingCard();
});

stopButton.addEventListener("click", () => {
  // Game is set to Stop
  gameState.stopClicked = true;
  stopButton.disabled = true;
  
  // Next player can have a final draw
  playerData.currentPlayerIndex = (playerData.currentPlayerIndex + 1) % 2;
  drawNextCard();
  initializeHeaderText();

  // Choose button becomes disabled
  chooseButton.disabled = true;
});

exitButton.addEventListener("click", () => {
  // Reset all variables
  gameState.turnCounter = 0;
  gameState.moveCounter = 0;
  gameState.phase = "reveal";
  gameState.stopClicked = false;
  gameState.currentRound = 0;

  // Show start screen and hide gameui
  startScreen.style.display = "flex";
  gameUI.style.display = "none";
});
restartButton.addEventListener("click", () => {
  // Reset all variables
  chooseButton.disabled = true;
  gameState.turnCounter = 0;
  gameState.moveCounter = 0;
  gameState.phase = "reveal";
  gameState.stopClicked = false;
  gameState.currentRound = 0;

  // Start the game again
  startGame();
});


laySpecialButton.addEventListener("click", () => {
  if(discardPileImg.dataset.value === "a") { 
    // Draw a new card + counter 
    specialCardDraw();
  } else if (discardPileImg.dataset.value === "b") { 
    // View a card
    specialCardView();
  } else if (discardPileImg.dataset.value === "c") { 
    // Switch two cards
    specialCardSwap();
  }
});

skipSpecialButton.addEventListener("click", () => {
    const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
    allPlayerCards.forEach(card => {
      card.classList.remove("selectable"); 
      card.classList.remove("selected"); 
    });

    // Advance turn, make the next card selectable
    advanceTurn();
    drawNextCard();
    initializeHeaderText();

    // Do not show the special card button, but show the choose button
    toggleButtons([laySpecialButton, skipSpecialButton, chooseButton]);
    chooseButton.disabled = true;
    specialCardsState.allowSpecial = false;
});





/////////////////////////////////////////////////
// HELPER FUNCTIONS. CAN BE MODULIZED LATER ON //
/////////////////////////////////////////////////

///////////////////////////
// Player input // 
///////////////////////////

// Function to create one input box per player count that is selected
function updatePlayerInputs() {
  const count = parseInt(playerCountSelect.value);
  playerInputsDiv.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Player ${i} Name`;
    input.name = `player${i}`;
    playerInputsDiv.appendChild(input);
  }
}

function getPlayerNames() {
  playerData.players = [];
  const inputs = document.querySelectorAll("#playerInputs input");
  inputs.forEach(input => {
      const name = input.value.trim() || "Player";
      playerData.players.push(name);
  });

  return playerData.players;
}

///////////////////////////
// Initializing the deck //
///////////////////////////

// Create the array which is the 'deck'
function createDeck() {
  array = [];

  // Add 4 copies of numbers 0-8
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j < 4; j++) {
      array.push(i.toString());
    }
  }

  // Add 9 copies of 9
  for (let i = 0; i < 9; i++) {
    array.push('9');
  }

  // Add special cards
  for (let i = 0; i < 9; i++) array.push('c'); // Trade two cards
  for (let i = 0; i < 7; i++) array.push('b'); // Reveal one card
  for (let i = 0; i < 5; i++) array.push('a'); // Take new card x2

  return array;
}

// Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Standard 
function dealCards(playerCount = 2, cardsPerPlayer = 4, players = [], deck) {
  const areas = {
    0: document.querySelector(".top"),
    1: document.querySelector(".bottom"),
    2: document.querySelector(".right"),
    3: document.querySelector(".left"),
  };

  // Clear all areas
  Object.values(areas).forEach((area) => {
    if (area) area.innerHTML = "";
  });

  for (let p = 0; p < playerCount; p++) {
    const playerArea = areas[p];
    if (!playerArea) continue;

    // Create and add player name label once per area, top-left
    const playerLabel = document.createElement("div");
    playerLabel.classList.add("player-area-label");
    playerLabel.textContent = playerData.players[p] || `Player ${p + 1}`;
    playerArea.appendChild(playerLabel);

    // Add cards for this player, assuming cards start at p*cardsPerPlayer index in deck
    for (let c = 0; c < cardsPerPlayer; c++) {
      const cardData = deck.shift();

      const cardWrapper = document.createElement("div");
      cardWrapper.classList.add("card-wrapper");

      const cardImg = document.createElement("img");
      cardImg.src = "images/Back.JPG";  // Or cardData.image if you have card face images
      cardImg.classList.add("card");
      cardImg.dataset.value = cardData;

      cardWrapper.appendChild(cardImg);
      playerArea.appendChild(cardWrapper);
    }
  }
}

// Setup the whole deck
function setupDeck(players) {
    deck = createDeck();
    shuffle(deck);
    dealCards(playerData.players.length, 4, playerData.players, deck);
    deckCount.textContent = deck.length;
}

///////////////////////////
// Game logic            //
///////////////////////////
function advanceTurn() {
  playerData.currentPlayerIndex = (playerData.currentPlayerIndex + 1) % 2;
  gameState.moveCounter++;
  if (gameState.moveCounter > 1) {
    gameState.turnCounter++;
    gameState.moveCounter = 0;
  }

  if (gameState.turnCounter > 1) {
    stopButton.disabled = false;
  }
}

function nextPlayerToReveal() {
  advanceTurn();

  // Update header text
  if (playerData.currentPlayerIndex === 0) {
    playerData.colorClass = "player-blue";
  } else if (playerData.currentPlayerIndex === 1) {
    playerData.colorClass = "player-green";
  }
  document.getElementById("headerText").innerHTML = 
    `<span class="player-name ${playerData.colorClass}">${playerData.players[playerData.currentPlayerIndex]}</span>, Selecteer twee kaarten`;
}

function moveNormalCard() {
  // Put deck card on discard pile
  if (discardPileImg.classList.contains("selected") && gameState.swapSource === "deck") {
    // This code block handles the animation, so it returns a promise.
    return new Promise(async (resolve) => {
      // Set new value to discard pile
      const deckCardValue = deck.shift();
      discardPileImg.dataset.value = deckCardValue;

      // Don't show the selected during the flying card
      deckCardImg.classList.remove("selected");
      discardPileImg.classList.remove("selected");
      specialCardsState.allowSpecial = true;

      deckCount.textContent = deck.length;
      await flyCard(deckCardImg, discardPileImg, `images/card_${deckCardValue}.JPG`, deckCardValue);
      
      resolve(); // Resolve the main promise after animations are done
    });
  } else {
    return new Promise(async (resolve) => {
      if (!gameState.swapTarget) return resolve();
      const oldValue = gameState.swapTarget.dataset.value;

      if (gameState.swapSource === "deck") {
        // 1. Animate card from deck to swapTarget
        const deckCardValue = deck.shift();
        deckCount.textContent = deck.length;

        await flyCard(deckCardImg, gameState.swapTarget, "images/Back.JPG", deckCardValue);

        // 2. Animate card from swapTarget to discard pile
        gameState.swapTarget.dataset.value = deckCardValue;
        await flyCard(gameState.swapTarget, discardPileImg, `images/card_${oldValue}.JPG`, oldValue);

        const valueDiv = gameState.swapTarget.nextElementSibling;
        if (valueDiv) valueDiv.textContent = deckCardValue;

        // 3. Update the discard pile image
        discardPileImg.src = `images/card_${oldValue}.JPG`;
        discardPileImg.dataset.value = oldValue;

        // 4. Start next draw possibility. Not used in the special draw card
        if (laySpecialButton.classList.contains("hidden")) {
          drawNextCard();
        }
        specialCardsState.allowSpecial = false;

        resolve(); // Resolve the main promise after both animations are done

      } else if (gameState.swapSource === "discard") {
        // 1. Animate discard pile to hand
        const discardValue = discardPileImg.dataset.value
        discardPileImg.src = '';
        await flyCard(discardPileImg, gameState.swapTarget, `images/card_${discardValue}.JPG`, discardValue);

        // 2. Animate hand to discard pile
        gameState.swapTarget.dataset.value = discardValue;
        gameState.swapTarget.src = "images/Back.JPG";
        await flyCard(gameState.swapTarget, discardPileImg, `images/card_${oldValue}.JPG`, oldValue);

        const valueDiv = gameState.swapTarget.nextElementSibling;
        if (valueDiv) valueDiv.textContent = discardValue;

        // 3. Update the discard pile image 
        discardPileImg.src = `images/card_${oldValue}.JPG`;
        discardPileImg.dataset.value = oldValue;
        specialCardsState.allowSpecial = false;

        resolve();
      }
    });
  }
}

function setupAfterLayingCard() {
  // After laying the last card of the round, the score will be noted
  if (
    specialCardsState.specialChars.some(char => discardPileImg.dataset.value.includes(char)) && specialCardsState.allowSpecial
  ) {
    toggleButtons([confirmButton, laySpecialButton, skipSpecialButton]);
    laySpecialButton.disabled = false;
    skipSpecialButton.disabled = false;
    stopButton.disabled = true;

    optionsForSpecialCard();
  } 
  else if (gameState.stopClicked) {
    (async () => {
      const playerOneRoundCell = `p1r${gameState.currentRound}`;
      const playerTwoRoundCell = `p2r${gameState.currentRound}`;

      // Animate each player's score
      const playerOneScore = await animatePlayerScore(".top .card", playerOneRoundCell);
      const playerTwoScore = await animatePlayerScore(".bottom .card", playerTwoRoundCell);

      // Update cumulative totals
      const scoreCellP1 = document.getElementById("p1r7");
      const scoreCellP2 = document.getElementById("p2r7");

      const previousScoreP1 = parseInt(scoreCellP1.textContent) || 0;
      const previousScoreP2 = parseInt(scoreCellP2.textContent) || 0;

      scoreCellP1.textContent = previousScoreP1 + playerOneScore;
      scoreCellP2.textContent = previousScoreP2 + playerTwoScore;

      startNextRoundButton.disabled = false;
    })();
    
    // End the game after round 6
    if(gameState.currentRound >= 6) {
        if(scoreCellP1 === scoreCellP2) {
          document.getElementById("headerText").textContent = "It is a Tie!"
        } else if (scoreCellP1 > scoreCellP2) {
            document.getElementById("headerText").innerHTML = 
             `<span class="player-name player-blue">${playerData.players[0]} has won!`;
        } else {
          document.getElementById("headerText").innerHTML = 
             `<span class="player-name player-green">${playerData.players[1]} has won!`;
        }
        // Volgend potje
        toggleButtons([confirmButton, stopButton, restartButton, exitButton]);
    } else {
      // Volgende rond + buttons
      document.getElementById("headerText").textContent = "Begin de volgende ronde";
      toggleButtons([confirmButton, stopButton, startNextRoundButton]);
    }
  } else {
    // Normal card changed. So just advance in turn
    advanceTurn();
    
    // Next card can be draw
    drawNextCard();
    initializeHeaderText();

    // Cannot confirm, but can choose the next card
    toggleButtons([chooseButton, confirmButton]);
    chooseButton.disabled = true;

    // Stop button can be enabled
    if (gameState.turnCounter > 1) {
      stopButton.disabled = false;
    }

    // Reset swap state
    gameState.swapTarget = null;
    gameState.swapSource = null;
  }
}



///////////////////////////
// Update texts          //
///////////////////////////

function initializeHeaderText() {
  // Randomly choose starting player
  const playerName = playerData.players[playerData.currentPlayerIndex];

  // Update header text
  if (playerData.currentPlayerIndex === 0) {
    playerData.colorClass = "player-blue";
  } else if (playerData.currentPlayerIndex === 1) {
    playerData.colorClass = "player-green";
  }
  if (gameState.phase === "reveal") {
    document.getElementById("headerText").innerHTML = 
    `<span class="player-name ${playerData.colorClass}">${playerName}</span>, Selecteer twee kaarten`;
  } else {
    document.getElementById("headerText").innerHTML = 
    `<span class="player-name ${playerData.colorClass}">${playerName}</span> is aan de beurt`;
  }
};


///////////////////////////
// Card Functions        //
///////////////////////////

// Ability to select cards in the player hands for the reveal phase
function updateSelectableCards() {
  deckDetails.selectedCards = [];

  // Determine area based on currentPlayerIndex
  let selector = null;
  if (playerData.currentPlayerIndex === 0) {
    selector = ".top .card-wrapper .card";
  } else if (playerData.currentPlayerIndex === 1) {
    selector = ".bottom .card-wrapper .card";
  }

  // Clear all cards' selectability first
  document.querySelectorAll(".card").forEach(card => {
    card.classList.remove("selectable", "selected");
    card.onclick = null;
  });

  if (selector) {
    const selectableCards = document.querySelectorAll(selector);
    selectableCards.forEach(card => {
      card.classList.add("selectable");
      card.onclick = () => {
        if (card.classList.contains("selected")) {
          card.classList.remove("selected");
          deckDetails.selectedCards = deckDetails.selectedCards.filter(c => c !== card);
        } else {
          if (deckDetails.selectedCards.length < deckDetails.maxSelectableCards) {
            card.classList.add("selected");
            deckDetails.selectedCards.push(card);
          }
        }

        // ✅ Call after every selection change
        updateRevealButtonState();
      };
    });
  } else {
    // If no valid area, disable the button
    updateRevealButtonState();
  }
}

function updateRevealButtonState() {
  if (deckDetails.selectedCards.length === deckDetails.maxSelectableCards) {
    revealButton.disabled = false;

    // Turn off selectability for all remaining selectable cards
    document.querySelectorAll(".card.selectable:not(.selected)").forEach(card => {
      card.classList.remove("selectable");
      card.classList.add("unselectable");
      card.onclick = null;
    });

  } else {
    revealButton.disabled = true;

    // Restore selectability for unselected cards
    document.querySelectorAll(".card.unselectable").forEach(card => {
      card.classList.remove("unselectable");
      card.classList.add("selectable");
      card.onclick = () => {
        if (card.classList.contains("selected")) {
          card.classList.remove("selected");
          deckDetails.selectedCards = deckDetails.selectedCards.filter(c => c !== card);
        } else if (deckDetails.selectedCards.length < deckDetails.maxSelectableCards) {
          card.classList.add("selected");
          deckDetails.selectedCards.push(card);
        }
        updateRevealButtonState(); // Re-check
      };
    });
  }
}

function selectOneDrawCard(selectableCard, source) {
  selectableCard.classList.add("selectable");

  selectableCard.onclick = () => {
    const isSelected = selectableCard.classList.contains("selected");

    // Deselect both
    deckCardImg.classList.remove("selected");
    discardPileImg.classList.remove("selected");

    if (!isSelected) {
      // Only select if it wasn’t already selected
      selectableCard.classList.add("selected");
      chooseButton.disabled = false;
      gameState.swapSource = source;
    } else {
      selectableCard.classList.add("selectable");
      chooseButton.disabled = true;
      gameState.swapSource = "";
    }
  }
}

// Option to choose and select a card
function drawNextCard() {

  // Clear classes
  deckCardImg.classList.remove("selected", "selectable");
  discardPileImg.classList.remove("selected", "selectable");

  // Deck card logic
  if (deck.length > 0) {
    selectOneDrawCard(deckCardImg, "deck");
  } else {
    deckCardImg.src = "";
    deckCardImg.style.cursor = "default";
    deckCardImg.onclick = null;
  }

  // Discard pile logic
  if (discardPileImg.dataset.value?.trim()) {
    selectOneDrawCard(discardPileImg, "deck");
  } else {
    discardPileImg.onclick = null;
  }
}

function allowSwapTargetSelection(allowDiscardCancel = false) {
  gameState.swapTarget = null;
  confirmButton.disabled = true;
  const currentSelector = playerData.currentPlayerIndex === 0 ? ".top .card" : ".bottom .card";

  // Allow selecting one of the player cards
  document.querySelectorAll(currentSelector).forEach(card => {
    card.classList.add("selectable");
    card.onclick = () => {
      document.querySelectorAll(currentSelector).forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      discardPileImg.classList.remove("selected");
      confirmButton.disabled = false;
      laySpecialButton.disabled = false;
      gameState.swapTarget = card;
    };
  });

  // Discard pile selection when deck card is chosen
  if (allowDiscardCancel) {
    discardPileImg.classList.add("selectable");
    discardPileImg.onclick = () => {
      document.querySelectorAll(currentSelector).forEach(c => c.classList.remove("selected"));
      discardPileImg.classList.add("selected");
      confirmButton.disabled = false;
      laySpecialButton.disabled = false;
      gameState.swapTarget = discardPileImg;
    };
  } else {
    discardPileImg.classList.remove("selectable");
    discardPileImg.onclick = null;
  }
}

///////////////////////////
// Special Cards         //
///////////////////////////

function optionsForSpecialCard() {
  specialCardsState.allowSpecial = false;

  if(discardPileImg.dataset.value === "a") { 
    // Draw a new card + counter 
    specialCardDrawVisibility();
  } else if (discardPileImg.dataset.value === "b") { 
    // View a card
    specialCardViewVisibility();
  } else if (discardPileImg.dataset.value === "c") {
    // Switch two cards
    specialCardSwapVisibility()
  }
}

function specialCardDrawVisibility(){
  deckCardImg.classList.add("selected");
}

async function specialCardDraw() {
  // Buttons and cards cannot be clicked
  skipSpecialButton.disabled = true;
  laySpecialButton.disabled = true;

  if(specialCardsState.specialDrawPhase === "draw") {
    disableCardClicks(true);
    deckCount.textContent = "";

    // Flip deck card
    chosenCard = deck[0];
    await flipCard(deckCardImg, `images/card_${chosenCard}.JPG`)

    // Next phase is to swap
    deckCount.textContent = deck.length;
    specialCardsState.specialDrawPhase = "swap";
    allowSwapTargetSelection(true);
  } else {
    // swap or lay the card
    specialCardsState.specialDrawCounter++;
    specialCardsState.specialDrawPhase = "draw";
   
    // Show movement of the card
    await moveNormalCard();

    // Reset the visibility of selected
    skipSpecialButton.disabled = false;
    laySpecialButton.disabled = false;
    deckCardImg.classList.add("selected");
    discardPileImg.classList.remove("selectable");
    const currentSelector = playerData.currentPlayerIndex === 0 ? ".top .card" : ".bottom .card";
    document.querySelectorAll(currentSelector).forEach(card => {
      card.classList.remove("selectable")
    });

    if(specialCardsState.specialDrawCounter > 1) {
      // Reset selectability 
      const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
      allPlayerCards.forEach(card => {
        card.classList.remove("selectable"); 
        card.classList.remove("selected"); 
      });

      setupAfterLayingCard();
      toggleButtons([laySpecialButton, skipSpecialButton, confirmButton]);
      chooseButton.disabled = true;
      specialCardsState.allowSpecial = false;
    }
  }
}

function specialCardViewVisibility() {
  laySpecialButton.disabled = true;
  // Set all player cards as selectable
  const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
  allPlayerCards.forEach(card => {
    card.classList.add("selectable"); 
    card.onclick = () => {
      allPlayerCards.forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      laySpecialButton.disabled = false;
    }
  });
}

async function specialCardView() {
  laySpecialButton.disabled = true;
  skipSpecialButton.disabled = true;

  // Reveal selected card
  const selectedCard = document.querySelector(".top .card.selected, .bottom .card.selected");

  await flipCard(selectedCard, `images/card_${selectedCard.dataset.value}.JPG`)

  // Reset selectability 
  const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
  allPlayerCards.forEach(card => {
    card.classList.remove("selectable"); 
    card.classList.remove("selected"); 
  });

  // Advance to next player and make the player draw a card
  setupAfterLayingCard();
  toggleButtons([laySpecialButton, skipSpecialButton, confirmButton]);
  chooseButton.disabled = true;
  specialCardsState.allowSpecial = false;
}

function specialCardSwapVisibility() {
      // Make all cards selectable
    const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
    allPlayerCards.forEach(card => {
      card.classList.add("selectable"); 
    });

    const PlayerOneCards = document.querySelectorAll(".top .card");
    const PlayerTwoCards = document.querySelectorAll(".bottom .card");

    function updateButtonState() {
      const playerOneSelected = document.querySelector(".top .card.selected");
      const playerTwoSelected = document.querySelector(".bottom .card.selected");
      laySpecialButton.disabled = !(playerOneSelected && playerTwoSelected);
    }

    PlayerOneCards.forEach(card => {
      card.onclick = () => {
        PlayerOneCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        updateButtonState();
      }
    });

    PlayerTwoCards.forEach(card => {
      card.onclick = () => {
        PlayerTwoCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        updateButtonState();
      }
    });

    // Disable button at the start
    updateButtonState();
}

async function specialCardSwap() {
  laySpecialButton.disabled = true;
  skipSpecialButton.disabled = true;

  // Swap selected cards
  const cardOne = document.querySelector(".top .card.selected");
  const cardTwo = document.querySelector(".bottom .card.selected");
  [cardOne.dataset.value, cardTwo.dataset.value] = [cardTwo.dataset.value, cardOne.dataset.value];

  await flyCard(cardOne, cardTwo, `images/Back.JPG`, cardOne.dataset.value);
  await flyCard(cardTwo, cardOne, `images/Back.JPG`, cardTwo.dataset.value);
  // Reset selectability 
  const allPlayerCards = document.querySelectorAll(".top .card, .bottom .card");
  allPlayerCards.forEach(card => {
    card.classList.remove("selectable"); 
    card.classList.remove("selected"); 
  });

  // Advance to next player and make the player draw a card
  setupAfterLayingCard();
  toggleButtons([laySpecialButton, skipSpecialButton, confirmButton]);
  chooseButton.disabled = true;
  specialCardsState.allowSpecial = false;
}

///////////////////////////
// Animations            //
///////////////////////////

function flipCard(card, frontSrc) {
  // Return a new Promise
  return new Promise(resolve => {
    // Preload the front image
    const img = new Image();
    img.src = frontSrc;

    // Step 1: rotate to 90deg
    card.style.transition = "transform 0.3s";
    card.style.transform = "rotateY(90deg)";

    setTimeout(() => {
      // Swap image slightly *before* rotation finishes
      card.src = frontSrc;

      // Rotate back to 0deg to show front
      card.style.transform = "rotateY(0deg)";
    }, 200); // slightly less than transition duration

    // Step 2: after showTime, flip back
    setTimeout(() => {
      card.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        card.src = "images/Back.JPG";
        card.style.transform = "rotateY(0deg)";

        // Resolve the promise once the final flip is complete
        resolve();
      }, 200);
    }, 200 + revealTime);
  });
}

function flipCardToFront(card, frontSrc) {
  // Return a new Promise
  return new Promise(resolve => {
    // Preload the front image
    const img = new Image();
    img.src = frontSrc;

    // Step 1: rotate to 90deg
    card.style.transition = "transform 0.3s";
    card.style.transform = "rotateY(90deg)";

    setTimeout(() => {
      // Swap image slightly *before* rotation finishes
      card.src = frontSrc;

      // Rotate back to 0deg to show front
      card.style.transform = "rotateY(0deg)";
    }, 200); // slightly less than transition duration

    resolve();
  });
}

function flyCard(sourceEl, destEl, cardSrc, cardValue) {
  return new Promise(resolve => {
    // Get source position and size
    const srcPos = sourceEl.getBoundingClientRect();

    // Create wrapper for proper sizing
    const flyingWrapper = document.createElement('div');
    flyingWrapper.classList.add('card-wrapper', 'card-fly');
    flyingWrapper.style.left = srcPos.left + 'px';
    flyingWrapper.style.top = srcPos.top + 'px';
    flyingWrapper.style.width = srcPos.width + 'px';
    flyingWrapper.style.height = srcPos.height + 'px';
    document.body.appendChild(flyingWrapper);

    // Create card inside wrapper
    const flyingCard = document.createElement('img');
    flyingCard.src = cardSrc;
    flyingCard.classList.add('card');
    flyingWrapper.appendChild(flyingCard);

    // Force reflow before animation
    flyingWrapper.offsetHeight;

    // Move toward destination
    const destPos = destEl.getBoundingClientRect();
    flyingWrapper.style.transform = `translate(${destPos.left - srcPos.left}px, ${destPos.top - srcPos.top}px)`;

    // When animation finishes
    flyingWrapper.addEventListener('transitionend', () => {
      // Update the destination element image/value if it's an <img>
      if (destEl.tagName.toLowerCase() === 'img') {
        destEl.src = cardSrc;
      }
      if (cardValue !== undefined) {
        destEl.dataset.value = cardValue;
      }
      flyingWrapper.remove();
      resolve(); // Resolve the promise here
    }, { once: true }); // The { once: true } option ensures the listener is automatically removed after firing
  });
}

// Smoothly animate score increase over 1 second
async function animateScoreIncrement(scoreCellId, startValue, endValue, duration = 1000) {
  const steps = Math.abs(endValue - startValue);
  if (steps === 0) return; // nothing to animate

  const stepTime = duration / steps; // time per increment
  let current = startValue;

  return new Promise(resolve => {
    const interval = setInterval(() => {
      current += (endValue > startValue ? 1 : -1);
      document.getElementById(scoreCellId).textContent = current;

      if (current === endValue) {
        clearInterval(interval);
        resolve();
      }
    }, stepTime);
  });
}

///////////////////////////
// End of round / scoring /
///////////////////////////

// Animate score calculation for one player
async function animatePlayerScore(selector, scoreCellId, delay = 300) {
  const cards = Array.from(document.querySelectorAll(selector));
  let totalValue = 0;

  for (const card of cards) {
    // start with whatever the card has
    let value = card.dataset.value;
    await flipCardToFront(card, `images/card_${value}.JPG`);

    // 🔹 Keep drawing/discarding until we get a numeric value
    while ((isNaN(parseInt(value, 10)) || value === "" || value === null) && deck.length > 0) {
      const newValue = deck.shift(); // could be number string or letter
      deckCount.textContent = deck.length;

      // Animate drawing new card onto the player’s card slot
      await flyCard(deckCardImg, card, `images/card_${newValue}.JPG`, newValue);

      // Send the old card to discard pile
      await flyCard(card, discardPileImg, `images/card_${value}.JPG`, value);
      discardPileImg.dataset.value = value;
      discardPileImg.src = `images/card_${value}.JPG`;

      // Update the card with the new value
      value = newValue;
      card.dataset.value = value;
      card.src = `images/card_${value}.JPG`;

      await wait(300);
    }

    // 🔹 At this point, `value` is the final card value
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue)) {

      const prevTotal = totalValue;
      totalValue += numericValue;
      await animateScoreIncrement(scoreCellId, prevTotal, totalValue, 1000);

      await wait(delay);
    }
  }

  return totalValue;
}

///////////////////////////
// Helper functions      //
///////////////////////////

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toggleButtons(elements) {
  elements.forEach((element) => element.classList.toggle('hidden'));
}

function toggleButton(element) {
  if (element) { // Check if the element exists to prevent errors
    element.classList.toggle('hidden');
  }
}

// Temporarily disable the clicking of cards during the reveal
function disableCardClicks(disable) {
  document.querySelectorAll(".card.selectable").forEach(card => {
    if (disable) {
      card.onclick = null;
      card.style.cursor = "default";
    } else {
      card.style.cursor = "pointer";
    }
  });
}

function resetCardSelectability(selector) {
  selector.forEach(card => {
    card.classList.remove("selectable"); 
    card.classList.remove("selected"); 
  });
}