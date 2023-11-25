async function updateTags() {
    tagify.loading(true).dropdown.hide();
    const tags = await browser.runtime.sendMessage({type: "tags"});
    tagify.whitelist = tags.sort();
    tagify.loading(false).dropdown.show();
}

function generateBookmarkFragment(bookmarks) {
    const fragment = document.createDocumentFragment();
    for (const bookmark of bookmarks) {
        let tooltip = document.createElement("div");
        tooltip.innerText = [bookmark.title, bookmark.url].join('\n\n');
        tooltip.classList.add("tooltip");
        let link = document.createElement("a");
        link.innerText = bookmark.title;
        link.href = bookmark.url;
        link.classList.add("bookmark");
        link.append(tooltip);
        fragment.append(link);
    }

    return fragment;
}

async function updateBookmarks() {
    if (tagify.value.length === 0) {
        bookmarksContainer.innerHTML = "";
        return;
    }
    const tags = tagify.value.map((t) => t.value);
    const bookmarks = await browser.runtime.sendMessage({type: "bookmarks", tags: tags});
    const fragment = generateBookmarkFragment(bookmarks);
    bookmarksContainer.replaceChildren(fragment);
}

const tagsElement = document.querySelector("#tags");
const bookmarksContainer = document.querySelector("#bookmark-container");
const tagify = new Tagify(tagsElement, {
    editTags: false,
    enforceWhitelist: true,
    whitelist: [],
    dropdown: {
        enabled: 0,
    }
});

tagify.on('add', updateBookmarks);
tagify.on('remove', updateBookmarks);
tagify.on('focus', updateTags);
