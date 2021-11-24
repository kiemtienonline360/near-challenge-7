import "regenerator-runtime/runtime";

import { initContract, login, logout } from "./utils";

import getConfig from "./config";
import Big from 'big.js';
const { networkId } = getConfig("development");

// global variable used throughout
let currentGreeting;

const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

const submitButton = document.querySelector("form button");

const avatarContainer = document.getElementById("avatar-container");
let currentAvatar = Date.now();

document.getElementById("refresh-avatar").onclick = (e) => {
  e.preventDefault();
  setAvatar(Date.now());
};

document.querySelector("form").onsubmit = async (event) => {
  event.preventDefault();

  // get elements from the form using their id attribute
  const { fieldset, greeting } = event.target.elements;

  // disable the form while the value gets updated on-chain
  fieldset.disabled = true;

  try {
    // make an update call to the smart contract
    await window.contract.setUser(
      {
        // pass the value that the user entered in the greeting field
        avatar: document.getElementById("greeting").value,
        name: document.getElementById("name").value,
      },
      BOATLOAD_OF_GAS,
      Big(document.getElementById("donation").value || '0').times(10 ** 24).toFixed()
    );
  } catch (e) {
    console.log(e);
    alert(
      "Something went wrong! " +
        "Maybe you need to sign out and back in? " +
        "Check your browser console for more info."
    );
    throw e;
  } finally {
    // re-enable the form, whether the call succeeded or failed
    fieldset.disabled = false;
  }

  // update the greeting in the UI
  await fetchGreeting();

  // show notification
  document.querySelector("[data-behavior=notification]").style.display =
    "block";

  // remove notification again after css animation completes
  // this allows it to be shown again next time the form is submitted
  setTimeout(() => {
    document.querySelector("[data-behavior=notification]").style.display =
      "none";
  }, 11000);
};

document.querySelector("#sign-in-button").onclick = login;
document.querySelector("#sign-out-button").onclick = logout;

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector("#signed-out-flow").style.display = "block";
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  document.querySelector("#signed-in-flow").style.display = "block";

  document.querySelectorAll("[data-behavior=account-id]").forEach((el) => {
    el.innerText = window.accountId;
  });

  // populate links in the notification box
  const accountLink = document.querySelector(
    "[data-behavior=notification] a:nth-of-type(1)"
  );
  accountLink.href = accountLink.href + window.accountId;
  accountLink.innerText = "@" + window.accountId;
  const contractLink = document.querySelector(
    "[data-behavior=notification] a:nth-of-type(2)"
  );
  contractLink.href = contractLink.href + window.contract.contractId;
  contractLink.innerText = "@" + window.contract.contractId;

  // update with selected networkId
  accountLink.href = accountLink.href.replace("testnet", networkId);
  contractLink.href = contractLink.href.replace("testnet", networkId);

  fetchGreeting();
}

function setAvatar(avatar) {
  currentAvatar = avatar;
  avatarContainer.src =
    "https://avatars.dicebear.com/api/bottts/" + currentAvatar + ".svg";
  document.getElementById("greeting").value = currentAvatar;
}

async function vote(event) {
  const target = event.target.closest('.vote');
    try {
      target.disabled = true;
      await window.contract.vote(
        {
          account: target.getAttribute("data-id"),
        },
        BOATLOAD_OF_GAS,
      );
    } catch (e) {
      console.log(e);
      alert(
        "Something went wrong! " +
          "Maybe you need to sign out and back in? " +
          "Check your browser console for more info."
      );
      throw e;
    } finally {
      // re-enable the form, whether the call succeeded or failed
      target.disabled = false;
      fetchGreeting();
    }

}

function renderAvatars(avatars) {
  const avatarEntries = avatars.sort((a, b) => {
    if (a.value.votes > b.value.votes) {
      return -1;
    }
    if (a.value.votes < b.value.votes) {
      return 1;
    }

    return 0;
  });

  const avatarContainer = document.querySelector(".user-list");
  let avatarHTML = "";
  console.log(Date.now());
  for (let i = 0; i < avatarEntries.length; i += 1) {
    let premium = '';
    if (avatarEntries[i].value.premium) {
      premium = ' class="premium"';
    }
    const createdAt = new Date(parseInt(avatarEntries[i].value.timestamp));
    avatarHTML += `<li${premium}>
      <div class="ribbon ribbon-top-left premium-indicator"><span>P2W</span></div>
      <strong class="rank">${i + 1}</strong>
      <img src="https://avatars.dicebear.com/api/bottts/${avatarEntries[i].value.avatar}.svg">
      <div>
        <strong>${avatarEntries[i].value.name}</strong>
        <small>${avatarEntries[i].key}</small>
        <small>${createdAt.toLocaleString()}</small>
      </div>
      <button class="vote" data-id="${avatarEntries[i].key}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 16.67l2.829 2.83 9.175-9.339 9.167 9.339 2.829-2.83-11.996-12.17z"/></svg>
      <span>${avatarEntries[i].value.votes}</span>
      </button>
    </li>`;
  }

  avatarContainer.innerHTML = avatarHTML;

  const voteButtons = document.querySelectorAll('.vote');

  for (let i = 0; i < voteButtons.length; i += 1) {
    voteButtons[i].onclick = vote;
  }
}

// update global currentGreeting variable; update DOM with it
async function fetchGreeting() {
  const users = await contract.getUsers();

  const userRegistered = users.findIndex((user) => user.key === window.accountId);

  if (userRegistered !== -1) {
    if (document.getElementById('new-user')) {
      document.getElementById('new-user').remove();
    }
  } else {
    setAvatar(Date.now());
  }
  renderAvatars(users);
  // document.querySelectorAll('[data-behavior=greeting]').forEach(el => {
  //   // set divs, spans, etc
  //   el.innerText = currentGreeting

  //   // set input elements
  //   el.value = currentGreeting
  // })
}

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
  .then(() => {
    if (window.walletConnection.isSignedIn()) signedInFlow();
    else signedOutFlow();
  })
  .catch(console.error);
