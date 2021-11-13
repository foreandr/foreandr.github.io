// JavaScript source code

/*
 */
class Project {
    // Properties
    constructor(name, date) {
    this.name_ = name;
    this.date_ = date;
    }
}



/* 
 */ 
class Paper extends Project{
    constructor(name, date, topic) {
        super(name, date);
        this.topic_ = topic;
    }
}


/*
 */
class Quote extends Paper {
    constructor(name, date, topic, author) {
        super(name, date, topic);
        this.author_ = author;
    }
}

const bettingProject = new Project("Betway Algorithm", "OCT 30 2021");
const LogosProject = new Project("Logos Project", "OCT 31 2021");
const PeriodicTableProject = new Project("Periodic Table Project", "OCT NOV 3 2021");
const AgentEnvironmentEssay = new Paper("AgentEnvironmentEssay", "OCT 30 2021", "Cognitive Science");
const ArtificialIntelligencePaper = new Paper("ArtificialIntelligencePaper", "OCT 31 2021", "AI")
const quote1 = new Quote("Betway 1", "OCT 30 2021", "Stuff", "someguy1");
const quote2 = new Quote("Betway 2", "OCT 28 2021", "Stuff", "someguy2");

var projectList = [
    bettingProject,
    LogosProject,
    PeriodicTableProject,
    AgentEnvironmentEssay,
    ArtificialIntelligencePaper,
    quote1,
    quote2
]

let Andre = {
    FirstName: "Andre",
    LastName: "Foreman",
    Projects: projectList
};
console.log(Andre);

function printHello() {
    console.log("hello tiddies world");
}