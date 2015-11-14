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

function getISBN() {
    var metatags = document.getElementsByTagName('meta');
    for (var i=0; i<metatags.length; i++)
    {
        if (metatags[i].getAttribute("property") == "good_reads:isbn") { 
            var isbn = metatags[i].getAttribute("content"); 
            getSPLId(isbn);
            return;
        } 
    }
    return null;
}

function getSPLId(isbn) {
    var u = "https://seattle.bibliocommons.com/search?utf8=✓&t=smart&search_category=keyword&q=" + isbn + "&commit=Search&formats=EBOOK";
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
                    //console.log(id);
                    if (id != null && id.match(regexp)) { 
                        var splId = id.substring(3);
                        console.log("Match: " + splId + " from: " + id);
                        checkAvailbility(splId);
                        return;
                    } 
                }
            }
        });
}

function checkAvailbility(splId) {
    var u = "https://seattle.bibliocommons.com/item/digital_availability/" + splId + ".json";
    console.log(u);
    var response = GM_xmlhttpRequest({
        url: u,
        method: 'GET',
        onload: function(response) {
            var h = JSON.parse(response.responseText)['html'];
            console.log(h);
            var divs = document.getElementsByTagName('div');
            for (var i=0; i<divs.length; i++)
            {
                if ("ISBN" == divs[i].innerHTML) { 
                    console.log("ISBN Match");
                    divs[i].innerHTML = h;
                    return;
                }
            }
        }
    });
}

getISBN();

