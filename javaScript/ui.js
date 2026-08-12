//coded by APR

import { findByProperty, buildLink, getParams, data } from "./state.js";

    const money = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'});
    export function moneyFormat(value){
        return money.format(value);
    }

    let toastTimer;
    export function showToast(message) {
        const toast = document.getElementById("toast");
        const text = document.getElementById("toastMessage");

        text.textContent = message;
        toast.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.hidden = true;
        }, 5000);
    }

    export function applyNavigation(navigation){ //primary use footer
        const elements = document.querySelectorAll("[data-navigation]");
            
        elements.forEach(element => {
            const id = element.dataset.navigation;
            const item = findByProperty(navigation, "id", id);      

            if(!item) return null;

            const href = buildLink(item);
            if(href) element.innerHTML = `<a href="${href}"> ${item.title} </a>`;      
        });  
    }

    export function trackCategoryPath(items, slug, path = []){
        for (const item of items) {
            const newpath = [...path,item];

            if (item.slug === slug) return newpath;

            if (item.children && item.children.length > 0) {
                const result = trackCategoryPath(item.children, slug, newpath);
                if (result) return result;
            }
        }
        return null;
    }

    export function renderCategoryPath(path){ //builds tree bar for category page
        const isProductPage = getParams().has("item");

        var html = ` <a href="index.html">Home</a> `;

        path.forEach((item, index) => {
            const islast = index === path.length - 1;

            html += `&nbsp;>&nbsp;`;

            if (!isProductPage && islast) {
                html+= `<strong>${item.title}</strong>`;
                return;
            }

            const href = buildLink(item, true);

            html += href ? `<a href="${href}">${item.title}</a>` : `${item.title}`;
        });

        if (isProductPage) html += "&nbsp;>";

        document.getElementById("tree-bar").innerHTML = html;       
    }
    export function getSubCategories(category){
        var html = "";
        if(category.children) {
            html += `<h3 id="cat-header">CATEGORIES</h3>`;
            const children = category.children;

            for (const child of children) {
                var href = buildLink(child);
                if (href) html += `<div><a href="${href}">${child.title}</a></div>`;
            }
            document.getElementById("categories").innerHTML = html;
        } else return html;
    }

    //descriptions for the category pages
    export function loadCategoryDescription(category){
        document.getElementById("cat-description").innerText = category.description || "";
    }