function flattenBookmarks(tree) {
    let result = [];
    for (const element of tree) {
        if (element.type === "folder") {
            result.push(...flattenBookmarks(element.children));
        } else if (element.type === "bookmark") {
            result.push({id: element.id, title: element.title, url: element.url});
        }
    }

    return result
}

async function buildBookmarkList() {
    let bookmarkTree = await browser.bookmarks.getTree();
    let bookmarks = flattenBookmarks(bookmarkTree);
    for (const bookmark of bookmarks) {
        bookmark.tags = await browser.experiments.tags.getTagsForURI(bookmark.url);
    }

    return bookmarks;
}

async function buildTagDictionary(bookmarks) {
    let dictionary = {};
    for (const bookmark of bookmarks) {
        for (const tag of bookmark.tags) {
            if (!(tag in dictionary)) {
                dictionary[tag] = [];
            }
            dictionary[tag].push(bookmark.id);
        }
    }

    return dictionary;
}

function getBookmarksForTags(tags) {
    let bookmarks = bookmarkList.slice();
    for (const tag of tags) {
        bookmarks = bookmarks.filter(b => b.tags.includes(tag));
    }

    return bookmarks;
}

async function handleBookmarkCreate(id, bookmark) {
    const tags = await browser.experiments.tags.getTagsForURI(bookmark.url);
    bookmarkList.push({id: id, title: bookmark.title, url: bookmark.url, tags: tags});
    for (const tag of tags) {
        if (!(tag in tagDictionary)) {
            tagDictionary[tag] = new Set();
        }
        tagDictionary[tag].add(bookmark.id);
    }
}

async function handleBookmarkRemove(id, bookmark) {
    const tags = bookmarkList.filter(b => b.id === id)[0].tags;
    bookmarkList = bookmarkList.filter(b => b.id !== id);
    for (const tag of tags) {
        tagDictionary[tag].delete(id);
        if (tagDictionary[tag].size === 0) {
            delete tagDictionary[tag];
        }
    }
}

function handleMessage(message, sender, sendResponse) {
    // FIXME: check sender and types
    if  (message.type === "tags") {
        const tags = Object.keys(tagDictionary);
        sendResponse(tags);
    } else if (message.type === "bookmarks") {
        const bookmarks = getBookmarksForTags(message.tags);
        sendResponse(bookmarks);
    }
}

var bookmarkList = await buildBookmarkList();
var tagDictionary = await buildTagDictionary(bookmarkList);

// TODO: periodically refresh bookmarks and tags, as changes to tags will not trigger bookmarks.onChanged
browser.bookmarks.onCreated.addListener(handleBookmarkCreate);
browser.bookmarks.onRemoved.addListener(handleBookmarkRemove);
browser.runtime.onMessage.addListener(handleMessage);
