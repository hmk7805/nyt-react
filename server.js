/* Showing Mongoose's "Populated" Method (18.3.8)
 * INSTRUCTOR ONLY
 * =============================================== */

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var Article = require("./models/Article.js");
var Saved = require("./models/Saved.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
var path = require("path");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://heroku_jcvdvd7s:rsdbf47hcbusd6mlf8pr77iaid@ds161580.mlab.com:61580/heroku_jcvdvd7s");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});


// Routes
// ======
//HTML route /mySavedArticles
app.get("/mySavedArticles", function(req, res) {
    res.sendFile(path.join(__dirname + "/public/saved.html"));
});
// A GET request to scrape the verge website
app.get("/scrape", function(req, res) {

    // Grab the body of the html with request
    request("http://www.theverge.com/archives", function(error, response, html) {
        // Load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, we grab every div with a class of body and do the following:
        $("div[class=body]").each(function(i, element) {
            // Save an empty result object
            var result = {};
            // Add the title, link and body of the story to the result object
            result.title = $(this).children().eq(1).children("a").text();
            result.link = $(this).children().eq(1).children("a").attr("href");
            result.body = $(this).children().eq(3).text();

            // Create a new Article entry
            var entry = new Article(result);
            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                }
            });
        });
    });
    // Refresh index.html
    setTimeout(() => { res.redirect("/") }, 1000);
});

//Save one article by id

app.get("/save/:id", function(req, res) {
    Article.findOne({ "_id": req.params.id })
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                var result = { title: doc.title, link: doc.link, body: doc.body };
                // Using our Article model, create a new entry
                // This effectively passes the result object to the entry (and the title and link)
                var entry = new Saved(result);

                // Now, save that entry to the db
                entry.save(function(err, doc) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                    }
                    // Or log the doc
                    else {
                        console.log(doc);
                        console.log(doc._id + "object saved");
                    }
                });

            }
        });
});
//This will delete the saved article by ObjectId
app.get("/delete/:id", function(req, res) {
    // Grab every doc in the Articles array
    Saved.findByIdAndRemove({ _id: req.params.id }, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            console.log(req.params.id + " Deleted");
        }
    });
});
//This will delete a note from the saved article by ObjectId
app.get("/deletenote/:id/:position", function(req, res) {
    console.log("line 137");
    var notes = Saved.findOne({ _id: req.params.id }).notes;
    notes.pop(req.params.position);
    // Grab every doc in the Articles array
    Saved.findByIdAndUpdate({ _id: req.params.id }, { $set: { notes: notes } });
});
// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// This will get the articles we scraped from the mongoDB
app.get("/savedArticles", function(req, res) {
    // Grab every doc in the Articles array
    Saved.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});
// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});
// Grab an article by it's ObjectId
app.get("/savedArticles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Saved.findOne({ "_id": req.params.id })
        // now, execute our query
        .exec(function(error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});


// Create a new note or replace an existing note
app.post("/saveNote/:id", function(req, res) {
    // Use the article id to find and update it's note
    Saved.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": req.body } }).then(function() {
        console.log("Note Added");
        res.redirect("/savedArticles");
    });
});


// Listen on port 3000
app.listen(3000, function() {
    console.log("App running on port 3000!");
});