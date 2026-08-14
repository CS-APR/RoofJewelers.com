//Coded by APR

//declarations

    export const shopping = {
        shoppingCart: [],
        shoppingList: []
    };

    export const inventory = {
        inventory: [],
        catInventory: [], //category specific inventory
        visibleProducts: [], //products vissible to user when on catalog page
        sortedInventory: null, //invetory with filters applied
        featuredInventory: [], //array for featured inventory
        searchResults: null,
        activeInventory: [] //inventory in use used to allow repurposing of functions
    }

    export const data = {
        navigation: null,
        CONFIG: null,
        imageManifest: null,
        categorySlug: null,
        attributes: null,
        base: 12, //catalog default display count
        displayCount: 12,
        start: 0,
        end: 0
    }

    export const page = {
        currentPage: 1,
        currentCatalogPage: null,
        pageCount: 0,//change inventory to category inventory when made
        isRendering: false,
        pendingPage: null,
        resetPage: false
    }


    export function findByProperty(items, property, value){
        for (const item of items) {
            if (item[property] === value) return item;

            if (item.children && item.children.length > 0) {
                const result = findByProperty(item.children, property, value);

                if (result) return result;
            }
        }

        return null;
    }

    export function buildLink(item, includePage = false){
        if(item.lslug) return `infoPage.html?lslug=${item.lslug}`;
        if(item.slug){
            let url = `catalog.html?slug=${item.slug}`;

            if(includePage && item.slug === data.categorySlug && page.currentCatalogPage != null) 
                url += `&page=${page.currentCatalogPage}`;
            return url;
        }
        if(item.link) return item.link;
        return "#";
    }

    export function getParams(){
        return new URLSearchParams(window.location.search);
    }

