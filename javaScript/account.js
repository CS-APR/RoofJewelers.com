//Coded by APR

import { closeSearch } from "./search.js";
import { closeCart } from "./cart.js";

//functions used for the account box
    export function closeAccount(){
        document.getElementById("accountBox")?.classList.remove("open");
    }

    export function initializeAccount() {
        const accountButton = document.getElementById("accountButton");
        const accountBox = document.getElementById("accountBox");

        if (!accountButton || !accountBox) return;

        accountButton.onclick = function(event) {
            event.stopPropagation();
            closeSearch();
            closeCart();
            accountBox.classList.toggle("open");
        }

        accountBox.onclick = function(event){
            event.stopPropagation();
        };
    }