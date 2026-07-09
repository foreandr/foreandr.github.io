import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TARGET_JOB_COUNT = 420

CATEGORIES = {
    "Software & Data": [
        "Software Engineer", "Backend Developer", "Frontend Developer", "Full Stack Developer",
        "Mobile App Developer", "iOS Developer", "Android Developer", "Game Developer",
        "Gameplay Programmer", "Graphics Programmer", "Systems Programmer", "Embedded Software Engineer",
        "Firmware Engineer", "DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer",
        "Platform Engineer", "Machine Learning Engineer", "AI Engineer", "Data Scientist",
        "Data Analyst", "Business Intelligence Analyst", "Data Engineer", "Analytics Engineer",
        "Database Administrator", "Cybersecurity Analyst", "Security Engineer", "Penetration Tester",
        "Network Engineer", "Solutions Architect", "Technical Product Manager", "QA Engineer",
        "Automation Tester", "Robotics Software Engineer", "Computer Vision Engineer", "NLP Engineer",
        "MLOps Engineer", "Quant Developer", "UX Engineer", "Developer Advocate",
    ],
    "Mathematics, Science & Research": [
        "Mathematician", "Applied Mathematician", "Statistician", "Biostatistician",
        "Actuary", "Operations Research Analyst", "Physics Researcher", "Mathematical Physicist",
        "Computational Physicist", "Theoretical Physicist", "Astronomer", "Chemist",
        "Materials Scientist", "Biologist", "Geneticist", "Neuroscientist",
        "Climate Scientist", "Geologist", "Hydrologist", "Oceanographer",
        "Research Scientist", "Lab Technician", "Research Assistant", "Scientific Programmer",
        "Experimental Physicist", "Particle Physicist", "Quantum Information Researcher",
        "Epidemiologist", "Bioinformatics Scientist", "Cognitive Scientist",
    ],
    "Education": [
        "Elementary School Teacher", "Middle School Teacher", "High School Math Teacher",
        "High School Physics Teacher", "High School Computer Science Teacher",
        "High School English Teacher", "High School History Teacher", "Special Education Teacher",
        "ESL Teacher", "College Instructor", "University Professor", "Math Tutor",
        "Coding Tutor", "Physics Tutor", "Curriculum Developer", "Instructional Designer",
        "Academic Advisor", "School Principal", "Education Consultant", "Corporate Trainer",
    ],
    "Law, Government & Public Policy": [
        "Lawyer", "Criminal Defense Lawyer", "Prosecutor", "Corporate Lawyer",
        "Civil Litigation Lawyer", "Family Lawyer", "Immigration Lawyer", "Tax Lawyer",
        "Intellectual Property Lawyer", "Privacy Lawyer", "Human Rights Lawyer",
        "Employment Lawyer", "Environmental Lawyer", "Real Estate Lawyer", "Paralegal",
        "Legal Assistant", "Judge", "Mediator", "Policy Analyst", "Legislative Assistant",
        "Diplomat", "Foreign Service Officer", "City Planner", "Urban Planner",
        "Public Administrator", "Compliance Officer", "Regulatory Affairs Specialist",
        "Lobbyist", "Political Strategist", "Campaign Manager",
    ],
    "Business, Finance & Operations": [
        "Entrepreneur", "Startup Founder", "Product Manager", "Project Manager",
        "Program Manager", "Operations Manager", "Business Analyst", "Management Consultant",
        "Strategy Consultant", "Accountant", "Auditor", "Financial Analyst",
        "Investment Analyst", "Portfolio Manager", "Equity Research Analyst", "Risk Analyst",
        "Quantitative Analyst", "Trader", "Investment Banker", "Venture Capital Analyst",
        "Private Equity Associate", "Insurance Underwriter", "Claims Adjuster",
        "Supply Chain Analyst", "Logistics Manager", "Procurement Specialist", "Sales Manager",
        "Account Executive", "Customer Success Manager", "Human Resources Manager",
    ],
    "Healthcare & Wellness": [
        "Doctor", "Family Physician", "Emergency Physician", "Surgeon",
        "Psychiatrist", "Psychologist", "Clinical Therapist", "Registered Nurse",
        "Nurse Practitioner", "Paramedic", "Pharmacist", "Dentist",
        "Dental Hygienist", "Optometrist", "Physiotherapist", "Occupational Therapist",
        "Chiropractor", "Dietitian", "Speech Language Pathologist",
        "Medical Laboratory Technologist", "Radiology Technologist", "Respiratory Therapist",
        "Veterinarian", "Veterinary Technician", "Personal Trainer",
        "Strength and Conditioning Coach", "Massage Therapist", "Public Health Officer",
        "Health Data Analyst", "Clinical Research Coordinator",
    ],
    "Creative, Media & Entertainment": [
        "Writer", "Novelist", "Screenwriter", "Copywriter", "Technical Writer",
        "Journalist", "Investigative Journalist", "Editor", "Content Strategist",
        "YouTuber", "Podcaster", "Video Producer", "Film Director", "Film Editor",
        "Cinematographer", "Photographer", "Graphic Designer", "UX Designer", "UI Designer",
        "Product Designer", "Animator", "3D Artist", "Concept Artist", "Illustrator",
        "Music Producer", "Composer", "Singer", "Actor", "Voice Actor",
        "Stand-up Comedian", "Game Designer", "Level Designer", "Narrative Designer",
    ],
    "Sports, Coaching & Recreation": [
        "Professional Volleyball Player", "Professional Basketball Player",
        "Professional Baseball Player", "Professional Soccer Player", "Professional Hockey Player",
        "MMA Fighter", "Boxer", "Track Athlete", "Marathon Runner", "Tennis Player",
        "Golf Professional", "Esports Player", "Volleyball Coach", "Basketball Coach",
        "Baseball Coach", "Soccer Coach", "Hockey Coach", "Athletic Director",
        "Sports Agent", "Sports Analyst", "Sports Data Analyst", "Scout", "Referee",
        "Fitness Coach", "Outdoor Guide", "Park Ranger", "Recreation Coordinator",
        "Ski Instructor", "Martial Arts Instructor", "Swim Coach",
    ],
    "Trades, Construction & Manufacturing": [
        "Electrician", "Plumber", "Carpenter", "Welder", "HVAC Technician",
        "Mechanic", "Automotive Technician", "Millwright", "Machinist", "CNC Operator",
        "Construction Manager", "General Contractor", "Heavy Equipment Operator",
        "Crane Operator", "Roofer", "Mason", "Painter", "Drywall Installer",
        "Cabinetmaker", "Industrial Designer", "Manufacturing Engineer",
        "Quality Control Inspector", "Production Supervisor", "Tool and Die Maker",
        "Aircraft Mechanic", "Elevator Technician", "Lineworker", "Surveyor",
        "Architectural Technologist", "Building Inspector",
    ],
    "Security, Military & Emergency": [
        "Police Officer", "Detective", "Private Investigator", "Security Guard",
        "Correctional Officer", "Border Services Officer", "Firefighter", "Emergency Manager",
        "Military Officer", "Infantry Soldier", "Intelligence Analyst",
        "Cyber Intelligence Analyst", "Search and Rescue Technician",
        "Disaster Response Coordinator", "Bodyguard", "Fraud Investigator",
        "Loss Prevention Specialist", "Emergency Dispatcher", "Public Safety Analyst",
    ],
    "Food, Hospitality & Tourism": [
        "Chef", "Sous Chef", "Baker", "Pastry Chef", "Restaurant Manager",
        "Bartender", "Bar Manager", "Sommelier", "Barista", "Hotel Manager",
        "Concierge", "Event Planner", "Travel Agent", "Tour Guide", "Flight Attendant",
        "Airline Pilot", "Cruise Director", "Caterer", "Food Scientist",
        "Food Safety Inspector",
    ],
    "Agriculture, Environment & Animals": [
        "Farmer", "Agronomist", "Horticulturist", "Arborist", "Forester",
        "Wildlife Biologist", "Conservation Officer", "Environmental Consultant",
        "Sustainability Manager", "Renewable Energy Analyst", "Solar Installer",
        "Wind Turbine Technician", "Animal Trainer", "Zookeeper", "Marine Biologist",
        "Fisheries Officer", "Landscape Architect", "Waste Management Coordinator",
        "Water Treatment Operator", "Ecologist",
    ],
    "Sales, Marketing & Customer": [
        "Marketing Manager", "Digital Marketing Specialist", "SEO Specialist",
        "Growth Marketer", "Brand Manager", "Market Research Analyst",
        "Public Relations Specialist", "Communications Manager", "Sales Representative",
        "Real Estate Agent", "Insurance Broker", "Mortgage Broker", "Retail Manager",
        "E-commerce Manager", "Merchandiser", "Fundraiser", "Community Manager",
        "Partnerships Manager", "Advertising Account Manager", "Customer Support Specialist",
    ],
    "Transportation & Logistics": [
        "Truck Driver", "Delivery Driver", "Courier", "Bus Driver", "Train Conductor",
        "Subway Operator", "Air Traffic Controller", "Logistics Coordinator",
        "Warehouse Manager", "Inventory Analyst", "Forklift Operator", "Dispatcher",
        "Shipping Coordinator", "Fleet Manager", "Marine Captain", "Ship Engineer",
        "Railway Engineer", "Customs Broker", "Import Export Specialist", "Traffic Engineer",
    ],
    "Architecture, Engineering & Real Estate": [
        "Architect", "Interior Designer", "Urban Designer", "Landscape Designer",
        "Real Estate Developer", "Property Manager", "Appraiser", "Home Inspector",
        "Civil Engineer", "Structural Engineer", "Mechanical Engineer", "Electrical Engineer",
        "Environmental Engineer", "Chemical Engineer", "Biomedical Engineer",
        "Aerospace Engineer", "Mining Engineer", "Petroleum Engineer", "Industrial Engineer",
        "Process Engineer",
    ],
    "Social Services, Religion & Nonprofit": [
        "Social Worker", "Youth Worker", "Case Manager", "Community Organizer",
        "Nonprofit Director", "Grant Writer", "Pastor", "Imam", "Chaplain",
        "Religious Scholar", "Philosophy Professor", "Ethicist", "Counsellor",
        "Addictions Worker", "Refugee Settlement Worker", "Charity Program Manager",
        "Volunteer Coordinator", "Humanitarian Aid Worker", "Peacebuilding Specialist",
        "Crisis Line Worker",
    ],
}

SPECIFIC_ROLES = {
    "Software & Data": [
        "Backend Infrastructure Engineer", "Frontend Design Engineer", "AI Product Engineer",
        "Data Visualization Developer", "Cybersecurity Incident Responder", "Cloud Security Engineer",
        "Game Tools Programmer", "Simulation Software Engineer", "Search Engineer",
        "Recommender Systems Engineer", "Database Reliability Engineer", "Blockchain Developer",
        "AR/VR Developer", "Computational Geometry Engineer", "Developer Tools Engineer",
    ],
    "Mathematics, Science & Research": [
        "Number Theorist", "Topology Researcher", "Machine Learning Research Scientist",
        "Cancer Research Scientist", "Fusion Energy Researcher", "Space Mission Scientist",
        "Forensic Scientist", "Pharmaceutical Scientist", "Ecological Modeler",
        "Behavioral Scientist", "Robotics Researcher", "Protein Design Scientist",
    ],
    "Education": [
        "Elementary Art Teacher", "Middle School Science Teacher", "High School Biology Teacher",
        "High School Chemistry Teacher", "High School Economics Teacher", "Community College Professor",
        "Online Course Creator", "Test Prep Tutor", "Homeschool Curriculum Designer",
        "Museum Educator", "Educational YouTuber", "Learning Experience Designer",
    ],
    "Law, Government & Public Policy": [
        "Public Defender", "District Attorney", "White Collar Defense Lawyer",
        "Mergers and Acquisitions Lawyer", "Constitutional Lawyer", "Patent Lawyer",
        "Entertainment Lawyer", "Sports Lawyer", "Public Policy Director",
        "Intelligence Officer", "Government Relations Manager", "Election Analyst",
    ],
    "Business, Finance & Operations": [
        "Small Business Owner", "Franchise Owner", "Restaurant Owner", "E-commerce Founder",
        "Hedge Fund Analyst", "Crypto Trader", "Corporate Development Manager",
        "Pricing Analyst", "Revenue Operations Manager", "Turnaround Consultant",
        "Business Broker", "Chief Operating Officer",
    ],
    "Healthcare & Wellness": [
        "Cardiologist", "Dermatologist", "Neurologist", "Pediatrician", "Anesthesiologist",
        "Orthopedic Surgeon", "Sports Medicine Doctor", "Emergency Room Nurse",
        "Mental Health Counselor", "Marriage and Family Therapist", "Athletic Trainer",
        "Sleep Technologist", "Hospital Administrator",
    ],
    "Creative, Media & Entertainment": [
        "Documentary Filmmaker", "Music Video Director", "Showrunner", "Book Editor",
        "Science Communicator", "Streamer", "Twitch Creator", "Substack Writer",
        "Creative Technologist", "Motion Designer", "Sound Designer", "Theater Director",
        "Art Director", "Fashion Designer",
    ],
    "Sports, Coaching & Recreation": [
        "Beach Volleyball Player", "NBA Player", "MLB Pitcher", "Soccer Goalkeeper",
        "Hockey Goalie", "Olympic Sprinter", "Powerlifter", "Climbing Coach",
        "Surf Instructor", "Tactical Strength Coach", "Sports Broadcaster",
        "Baseball General Manager", "Esports Coach",
    ],
    "Trades, Construction & Manufacturing": [
        "Solar Electrician", "Diesel Mechanic", "Robotics Technician", "Pipefitter",
        "Blacksmith", "Luthier", "Furniture Maker", "Boat Builder", "Home Renovator",
        "Factory Automation Technician", "Safety Inspector", "Metal Fabricator",
    ],
    "Security, Military & Emergency": [
        "SWAT Officer", "Crime Scene Investigator", "Wildland Firefighter",
        "Coast Guard Rescue Swimmer", "Army Ranger", "Navy Officer", "Air Force Pilot",
        "Explosive Ordnance Disposal Technician", "Emergency Preparedness Planner",
        "Corporate Security Director",
    ],
    "Food, Hospitality & Tourism": [
        "Food Truck Owner", "Coffee Roaster", "Brewmaster", "Winemaker", "Butcher",
        "Private Chef", "Resort Manager", "Luxury Travel Advisor", "Theme Park Designer",
        "Restaurant Critic",
    ],
    "Agriculture, Environment & Animals": [
        "Organic Farmer", "Rancher", "Beekeeper", "Horse Trainer", "Dog Trainer",
        "Aquaculture Farmer", "Permaculture Designer", "Climate Adaptation Planner",
        "Environmental Restoration Specialist", "National Park Superintendent",
    ],
    "Sales, Marketing & Customer": [
        "Tech Sales Engineer", "Luxury Real Estate Agent", "Creator Partnerships Manager",
        "Podcast Ad Sales Manager", "Political Communications Director",
        "Brand Strategist", "Direct Response Copywriter", "Community Growth Lead",
        "Sponsorship Manager", "Retail Buyer",
    ],
    "Transportation & Logistics": [
        "Cargo Pilot", "Harbor Pilot", "Long Haul Truck Owner Operator",
        "High Speed Rail Planner", "Drone Delivery Operator", "Race Car Driver",
        "Logistics Network Designer", "Aviation Dispatcher", "Yacht Captain",
    ],
    "Architecture, Engineering & Real Estate": [
        "Skyscraper Architect", "Theme Park Architect", "Bridge Engineer",
        "Nuclear Engineer", "Rocket Propulsion Engineer", "Geotechnical Engineer",
        "Robotics Hardware Engineer", "Real Estate Investor", "Construction Developer",
        "Smart Home Designer",
    ],
    "Social Services, Religion & Nonprofit": [
        "Prison Reentry Counselor", "International Aid Worker", "Think Tank Fellow",
        "Foundation Program Officer", "Public Philosopher", "Monastery Administrator",
        "Youth Sports Program Director", "Crisis Negotiator", "Community Health Worker",
    ],
}


def add_job(rows, seen, title, category, subcategory, keywords):
    key = title.lower()
    if key in seen or len(rows) >= 2000:
        return
    seen.add(key)
    rows.append({
        "id": f"J{len(rows) + 1:04d}",
        "title": title,
        "category": category,
        "subcategory": subcategory,
        "keywords": keywords,
    })


def build_jobs():
    rows = []
    seen = set()

    for category, jobs in CATEGORIES.items():
        for title in jobs:
            add_job(rows, seen, title, category, "Core role", category.lower())

    for category, jobs in SPECIFIC_ROLES.items():
        for title in jobs:
            add_job(rows, seen, title, category, "Specific role", category.lower())

    return rows[:TARGET_JOB_COUNT]


def main():
    rows = build_jobs()
    with (ROOT / "jobs.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "title", "category", "subcategory", "keywords"])
        writer.writeheader()
        writer.writerows(rows)

    with (ROOT / "jobs.js").open("w", encoding="utf-8") as handle:
        handle.write("window.JOB_OR_NOT_JOBS = ")
        json.dump(rows, handle, ensure_ascii=True, indent=2)
        handle.write(";\n")

    print(f"Generated {len(rows)} jobs")


if __name__ == "__main__":
    main()
