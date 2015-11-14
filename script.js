// ==UserScript==
// @name         Goodreads ISBN Checker Against SPL
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Lookup SPL availability based on Goodreads ISBN
// @author       Alexander Faucher
// @match        https://www.goodreads.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/* jshint -W097 */
'use strict';

// Your code here...

function checkAvailbility(isbn, splId, callback) {
    var u = "https://seattle.bibliocommons.com/item/digital_availability/" + splId + ".json";
    console.log(u);
    var response = GM_xmlhttpRequest({
        url: u,
        method: 'GET',
        onload: function(response) {
            var availbilityHtml = JSON.parse(response.responseText)['html'];
            callback(isbn, splId, availbilityHtml);

        }
    });
}

function getSplAvailabilityFromSearchResult(root) {
    var spans = root.getElementsByTagName('span');
    for (var i = 0; i < spans.length; i++) {
        var testid = spans[i].getAttribute('testid');
        if (testid !== null && testid == 'item_availability') {
            //Wrap in HTML here to be consistent with pulling from the json blob
            console.log('Found: ' + spans[i].innerHTML);
            return '<span>' + spans[i].innerHTML + '</span>';
        }
    }
    return null;
}

function getSplId(isbn, callback) {
    var u = "https://seattle.bibliocommons.com/search?utf8=✓&t=smart&search_category=keyword&q=" + isbn + "&commit=Search"; //&formats=EBOOK
    console.log(u);
    var response = GM_xmlhttpRequest({
        url: u,
        method: 'GET',
        onload: function(response) {
            var splSiteDOM = new DOMParser().parseFromString(
                response.responseText, 
                "text/html");
            var divs = splSiteDOM.getElementsByTagName('div');
            var regexp = /bib[0-9]+/g;
            for (var i=0; i<divs.length; i++)
            {
                var id = divs[i].getAttribute("id");
                if (id !== null && id.match(regexp)) { 
                    var splId = id.substring(3);
                    console.log('SplId: ' + splId);
                    var availabilityHtml = getSplAvailabilityFromSearchResult(divs[i]);
                    callback(isbn, splId, availabilityHtml);
                    return;
                } 
            }
        }
    });
}

function lookupAvailabilityFromIsbn(isbn, callback) {
    getSplId(
        isbn, 
        function(isbn, splId, availabilityHtml) {
            if (availabilityHtml === null) {
                console.log('Doing extra availbility check for ebook on isbn: ' + isbn);
                checkAvailbility(isbn, splId, callback);
            } else {
                console.log('Skipping extra availbility check for real live book on isbn: ' + isbn);
                callback(isbn, splId, availabilityHtml);
            }
        });
}
             
function getIsbnFromDetailPage() {
    var metatags = document.getElementsByTagName('meta');
    for (var i=0; i<metatags.length; i++)
    {
        if (metatags[i].getAttribute("property") == "good_reads:isbn") { 
            var isbn = metatags[i].getAttribute("content"); 
            console.log('Got ISBN from detail page: ' + isbn);
            return isbn;
        }
    }
    return null;
}
    
function updateIsbnDivOnDetailPage(isbn, splId, availabilityHtml) {
    var divs = document.getElementsByTagName('div');
    for (var i=0; i<divs.length; i++)
    {
        if ("ISBN" == divs[i].innerHTML) { 
            divs[i].innerHTML += '<br><a href="https://seattle.bibliocommons.com/search?utf8=%E2%9C%93&t=smart&search_category=keyword&commit=Search&q=' + isbn + '">' + availabilityHtml + '</a>';
            return;
        }
    }
}

var isbn = getIsbnFromDetailPage();
if (isbn !== null) {
    lookupAvailabilityFromIsbn(
        isbn, 
        updateIsbnDivOnDetailPage
    );
}

function updateIsbnOnListPage(isbn, splId, availabilityHtml) {
    console.log('Writing availbility on list page: ' + isbn);
    var divs = document.getElementsByTagName('td');
    for (var i=0; i<divs.length; i++)
    {
        if (divs[i].innerHTML !== null && divs[i].innerHTML.indexOf(isbn) != -1) { 
            divs[i].innerHTML += '<a href="https://seattle.bibliocommons.com/search?utf8=%E2%9C%93&t=smart&search_category=keyword&commit=Search&q=' + isbn + '">' + availabilityHtml + '</a>';
            return;
        }
    }
}

function getIsbnsFromList() {
    var isbns = [];
    var columns = document.getElementsByTagName('td');
    var regexp = /[0-9]{10}/g;
    for (var i=0; i < columns.length; i++) {
        var column = columns[i];
        var clazz = column.getAttribute("class");
        if ("field isbn" == clazz) {
            var innerDivs = column.getElementsByTagName('div');
            for (var j=0; j < innerDivs.length; j++) {
                var isbn = innerDivs[j].innerHTML;
                if (isbn !== null && isbn.trim().match(regexp)) {
                    isbn = isbn.trim();
                    console.log('Got ISBN from list page: ' + isbn);
                    isbns.push(isbn);
                }
            }
        }
    }
    return isbns;
}

var isbns = getIsbnsFromList();

for (var i = 0; i < isbns.length; i++) {
    lookupAvailabilityFromIsbn(
        isbns[i], 
        updateIsbnOnListPage
    );
}


