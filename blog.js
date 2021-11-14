var titleOfPost;
var contentsOfPost;
var date;
function process() {
    titleOfPost = "title of Post"; // change title to whatever
    contentsOfPost = "Contents of Post";
    date = "nov 2 2222";
    document.getElementById("enterBlogPosts").innerHTML +=
        `<div> 
        Title: ${titleOfPost}
        </br>
        Date: ${date}
        </br>
        Contents: ${contentsOfPost}
        </div>
        </br>`;

    // Add more Posts
}

function printFunction() {

}

process();