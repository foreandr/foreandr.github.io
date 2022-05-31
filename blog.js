function process(titleOfPost, date, bloghtmlFile) {
    /*
    titleOfPost = "title of Post"; // change title to whatever
    contentsOfPost = "Contents of Post";
    date = "nov 2 2222";
    */

    document.getElementById("enterBlogPosts").innerHTML +=
        `<div> 
        <a class="${bloghtmlFile}" href="./${bloghtmlFile}" onclick="printFunction()">Title: ${titleOfPost}</a>
        </br>
        Date: ${date}
        </br> </br>`;

    // Add more Posts
    console.log(bloghtmlFile);
}
function printFunction() {
    console.log("skzjhlkjhadsf");
}
//<button class="link">Clicky</button>
// First Blog Post test
var titleOfPost1 = "This is me";
var date1 = "Jan 1 2020";
var linkToHtml = "blog/blog1.html";

process(titleOfPost1, date1, linkToHtml);

// Second Blog Post test
var titleOfPost2 = "This is me2";
var date2 = "Jan 2 2020";
var linkToHtml = "blog/blog2.html";
process(titleOfPost2, date2, linkToHtml);
