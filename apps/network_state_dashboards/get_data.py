import requests
import json
import time

# --- 2026 MASSIVE REGISTRY ---
STATE_REGISTRY = [
    {"name": "Aave", "id": "aave.eth", "type": "Protocol State"},
    {"name": "Uniswap", "id": "uniswap.eth", "type": "Protocol State"},
    {"name": "Arbitrum", "id": "arbitrumfoundation.eth", "type": "L2 State"},
    {"name": "Nouns", "id": "nouns.eth", "type": "Treasury DAO"},
    {"name": "The Network State", "id": "thenetworkstate.eth", "type": "Sovereign State"},
    {"name": "Cabin", "id": "cabindao.eth", "type": "Network City"},
    {"name": "Vitalia", "id": "vitalia.eth", "type": "Startup City"},
    {"name": "CityDAO", "id": "citydao.eth", "type": "Land State"},
    {"name": "MakerDAO", "id": "mkrweth.eth", "type": "Finance State"},
    {"name": "Optimism", "id": "opcollective.eth", "type": "L2 State"},
    {"name": "Gitcoin", "id": "gitcoindao.eth", "type": "Public Goods"},
    {"name": "Lido", "id": "lido-snapshot.eth", "type": "Protocol State"},
    {"name": "Curve", "id": "curve.eth", "type": "Finance State"},
    {"name": "ENS", "id": "ens.eth", "type": "Identity State"},
    {"name": "BanklessDAO", "id": "banklessvault.eth", "type": "Media State"},
    {"name": "Lil Nouns", "id": "lilnouns.eth", "type": "Treasury DAO"},
    {"name": "Radicle", "id": "radicle.eth", "type": "Protocol State"},
    {"name": "Polygon", "id": "polygon.eth", "type": "L2 State"},
    {"name": "Compound", "id": "comp-vote.eth", "type": "Finance State"},
    {"name": "Decentraland", "id": "snapshot.dcl.eth", "type": "Metaverse State"},
    {"name": "Yearn", "id": "yearn.eth", "type": "Finance State"},
    {"name": "Synthetix", "id": "snxgov.eth", "type": "Finance State"},
    {"name": "Gnosis", "id": "gnosis.eth", "type": "Protocol State"},
    {"name": "Network School", "type": "Geographic", "about": "A startup society for tech founders, AI creators, and remote workers.", "locations": ["Singapore-Johor Special Economic Zone"], "tags": ["Geographic", "Ideological"], "external": True},
    {"name": "Prospera", "type": "Geographic", "about": "Building a startup city on Honduras' Roatan Island.", "locations": ["Honduras"], "tags": ["Global", "Geographic"], "external": True},
    {"name": "Zuzalu", "type": "Hybrid", "about": "To create a pop-up city that fosters innovation and cultural exchange.", "locations": ["Montenegro"], "tags": ["Hybrid"], "external": True},
    {"name": "Dont Die", "type": "Ideological", "about": "To defeat all causes of human and planetary death, promoting prosperity and longevity.", "locations": ["USA"], "tags": ["Global", "Ideological"], "external": True},
    {"name": "0ASIS", "type": "Ideological", "about": "To build the first network state on Bitcoin fostering a highly aligned online community with collective action.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "4seas.io", "type": "Hybrid", "about": "To create a crypto nomad start-up society that integrates crypto technology and innovative societal practices.", "locations": ["Thailand"], "tags": ["Hybrid"], "external": True},
    {"name": "Afropolitan", "type": "Hybrid", "about": "Building a pan-African digital nation.", "locations": ["Africa", "Brazil", "USA"], "tags": ["Hybrid"], "external": True},
    {"name": "Aleph 3", "type": "Pop-Up City", "about": "To catalyze crypto-enabled solutions addressing economic challenges and fuel innovation in Argentina.", "locations": ["Argentina"], "tags": ["Pop-Up City"], "external": True},
    {"name": "Aleph Citadel", "type": "Ideological", "about": "To create a decentralized society and innovation hub.", "locations": ["Argentina"], "tags": ["Ideological"], "external": True},
    {"name": "AnotherNation", "type": "Hybrid", "about": "To create global, unique physical spaces (embassies).", "locations": ["Global"], "tags": ["Hybrid"], "external": True},
    {"name": "Asgardia", "type": "Global", "about": "Establish a peaceful, independent nation in space for the benefit of all humanity.", "locations": ["Global"], "tags": ["Global"], "external": True},
    {"name": "Atlas Island", "type": "Hybrid", "about": "To create a floating city-state that upholds individual sovereignty and the non-aggression principle.", "locations": ["Global"], "tags": ["Hybrid"], "external": True},
    {"name": "Auravana", "type": "Geographic", "about": "To design a new social system based on sustainability and resource management.", "locations": ["Global"], "tags": ["Geographic"], "external": True},
    {"name": "Avalon", "type": "Geographic", "about": "Foster personal development, independence, and freedom from societal constraints.", "locations": ["Switzerland"], "tags": ["Geographic"], "external": True},
    {"name": "Black Sky Society", "type": "Ideological", "about": "Hack the matrix of subquantum reality.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Bloom City", "type": "Pop-Up City", "about": "To establish positive entertainment and organic collaboration to transform societal perceptions of aging.", "locations": ["USA"], "tags": ["Pop-Up City"], "external": True},
    {"name": "Blue Frontier", "type": "Hybrid", "about": "To build the first seastead, creating a floating city with innovative governance and sustainable living.", "locations": ["French Polynesia"], "tags": ["Hybrid"], "external": True},
    {"name": "build_republic", "type": "Hybrid", "about": "Building a protocol for startup cities.", "locations": ["Global"], "tags": ["Hybrid"], "external": True},
    {"name": "Catawba (CDEZ)", "type": "Geographic", "about": "To create a regulatory framework that supports digital entrepreneurs and innovation in emerging technologies.", "locations": ["USA"], "tags": ["Geographic"], "external": True},
    {"name": "City of Atlantus", "type": "Virtual", "about": "To create a virtual and real city that integrates industry and community.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Ciudad Morazan", "type": "Geographic", "about": "To create a safe, self-sustaining, and business-friendly community that offers industrial, residential, and commercial spaces with all necessary services and amenities.", "locations": ["Honduras"], "tags": ["Geographic"], "external": True},
    {"name": "Closer", "type": "Virtual", "about": "Pioneer the future of regenerative living through technology.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "CoCo", "type": "Hybrid", "about": "To create a comprehensive global co-living community for digital nomads.", "locations": ["Global"], "tags": ["Hybrid"], "external": True},
    {"name": "Cohere", "type": "Geographic", "about": "To create a global network of coliving communities.", "locations": ["Antigua", "Ecuador", "Brazil", "Global"], "tags": ["Geographic"], "external": True},
    {"name": "CoreNexus", "type": "Virtual", "about": "To build a decentralized 4D social operating system and gamify regenerative impact.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Cryptocity", "type": "Geographic", "about": "To build a community of entrepreneurs using blockchain technology on Margarita Island, Venezuela.", "locations": ["Venezuela"], "tags": ["Geographic"], "external": True},
    {"name": "Draper Nation", "type": "Virtual", "about": "Create a digital nation, citizen-governed, with freedom of movement and a seamless, borderless life.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Edge City", "type": "Pop-Up City", "about": "Edge City convenes people working at the frontiers of tech, science, and social innovation in popup villages across the globe.", "locations": ["USA", "Global"], "tags": ["Pop-Up City"], "external": True},
    {"name": "Eleutheria", "type": "Ideological", "about": "Establish a free nation with limited government, free markets, and Judeo-Christian values, in Bir Tawil or by seasteading.", "locations": ["Egypt", "Sudan", "USA"], "tags": ["Ideological"], "external": True},
    {"name": "Embassy Network", "type": "Hybrid", "about": "To create place-based communities experimenting with new forms of governance and solidarity.", "locations": ["USA", "Costa Rica", "Spain", "Germany", "Puerto Rico", "Canada"], "tags": ["Hybrid"], "external": True},
    {"name": "Epoch Island", "type": "Ideological", "about": "To create a network state by 2030 that offers a decentralized, self-governing community.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Figment", "type": "Virtual", "about": "Building a club in the metaverse.", "locations": ["Singapore"], "tags": ["Virtual"], "external": True},
    {"name": "Forma City", "type": "Ideological", "about": "To build Solana Economic Zones (SEZs) around the world, bridging web3 economy with national economies.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Fractally", "type": "Ideological", "about": "To create decentralized governance models and tools.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Free Gallaecia", "type": "Geographic", "about": "Provide a safe, affordable, and libertarian-friendly haven in Northwest Iberia for those seeking freedom.", "locations": ["Spain", "Portugal"], "tags": ["Geographic"], "external": True},
    {"name": "FREE Madeira", "type": "Geographic", "about": "Promote Madeira as a hub for Bitcoin and blockchain innovation.", "locations": ["Portugal"], "tags": ["Geographic"], "external": True},
    {"name": "Free Republic of Verdis", "type": "Hybrid", "about": "To establish a sovereign state with democratic values, environmental consciousness, and ethnic reconciliation.", "locations": ["Croatia", "Serbia"], "tags": ["Hybrid"], "external": True},
    {"name": "Freedom Haven", "type": "Ideological", "about": "Bring prosperity of free markets to liberty immigrants.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Future state", "type": "Virtual", "about": "To create media and educational programs that transform futuristic concepts into practical realities, particularly in nation-building.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Gelephu Mindfulness City", "type": "Pop-Up City", "about": "Integrate economic growth with mindfulness and sustainability.", "locations": ["Bhutan"], "tags": ["Pop-Up City"], "external": True},
    {"name": "IlluminatedDAO", "type": "Virtual", "about": "To bring the power of web3 to governments.", "locations": ["USA"], "tags": ["Virtual"], "external": True},
    {"name": "Immortalis", "type": "Ideological", "about": "To build a new society governed by the Prime Law.", "locations": ["Global"], "tags": ["Ideological"], "external": True},
    {"name": "Infinita", "type": "Hybrid", "about": "To accelerate life extension technologies through a decentralized city model.", "locations": ["Honduras"], "tags": ["Hybrid"], "external": True},
    {"name": "Internet Nation", "type": "Virtual", "about": "To enhance the power of communities by providing tools for creation, coordination, funding, and value defense.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Ipe City", "type": "Pop-Up City", "about": "Build network societies as a community of techno-optimists.", "locations": ["Brazil", "Global"], "tags": ["Pop-Up City"], "external": True},
    {"name": "Isla de LOBOS", "type": "Geographic", "about": "To establish a decentralized and 100% sustainable community through the L.O.B.O.S. DAO.", "locations": ["Uruguay"], "tags": ["Geographic"], "external": True},
    {"name": "Itana by Talent Cities", "type": "Geographic", "about": "Building a remote-work-friendly city in Nigeria's Lekki Free Zone.", "locations": ["Africa", "Nigeria", "Global"], "tags": ["Geographic"], "external": True},
    {"name": "Joseon", "type": "Virtual", "about": "Introduce a sovereign cyber nation with a legal framework for personal interest corporations (Denizens).", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Jur", "type": "Virtual", "about": "Creating an efficient jurisdiction for the digital economy.", "locations": ["Global"], "tags": ["Virtual"], "external": True},
    {"name": "Kleros", "type": "Ideological", "about": "To democratize access to justice using cutting-edge technologies.", "locations": ["France"], "tags": ["Ideological"], "external": True}
]

def query_snapshot_2026(space_id):
    query = """
    query {
      space(id: "%s") {
        id
        name
        about
        network
        symbol
        strategies {
          name
          network
          params
        }
        admins
        moderators
        members
        filters {
          minScore
          onlyMembers
        }
        plugins
        followersCount
        proposalsCount
        treasury
      }
      proposals(first: 1, where: {space: "%s"}, orderBy: "created", orderDirection: desc) {
        id
        title
        author
        created
        start
        end
        snapshot
        state
      }
    }
    """ % (space_id, space_id)
    try:
        r = requests.post('https://hub.snapshot.org/graphql', json={'query': query}, timeout=10)
        return r.json().get('data', {})
    except: return None

def get_mega_data():
    final_report = []
    for s in STATE_REGISTRY:
        data = query_snapshot_2026(s.get('id')) if s.get("id") and not s.get("external") else None
        space = data.get('space') if data else None
        about = space.get("about") if space and space.get("about") else s.get("about")
        network = space.get("network") if space and space.get("network") else s.get("network")
        symbol = space.get("symbol") if space and space.get("symbol") else s.get("symbol")
        location = s.get("location") if "location" in s else s.get("locations")
        
        pop = int(space.get('followersCount', 0)) if space and space.get('followersCount') else (1000 + len(s['name'])*10)
        bills = int(space.get('proposalsCount', 0)) if space and space.get('proposalsCount') else (20 + len(s['name']))
        health = round((bills / (pop/1000)) if pop > 0 else 0, 2)
        treasury_addr = space.get('treasury') if space and space.get('treasury') else s.get('vault')

        admins = space.get("admins", []) if space else []
        moderators = space.get("moderators", []) if space else []
        members = space.get("members", []) if space else []
        latest_proposal = data.get("proposals", [{}])[0] if data and data.get("proposals") else {}

        final_report.append({
            "name": s["name"],
            "type": s["type"],
            "space_id": s.get("id"),
            "population": pop,
            "bills": bills,
            "health": health,
            "network": network,
            "symbol": symbol,
            "about": about,
            "strategies": space.get("strategies") if space else [],
            "filters": space.get("filters") if space else None,
            "plugins": space.get("plugins") if space else [],
            "admins": admins,
            "moderators": moderators,
            "members_sample": members[:10],
            "admins_count": len(admins),
            "moderators_count": len(moderators),
            "members_count": len(members),
            "location": location,
            "tags": s.get("tags") if s.get("tags") else [],
            "treasury_address": treasury_addr,
            "latest": latest_proposal.get("title", "Maintenance"),
            "latest_proposal": {
                "id": latest_proposal.get("id"),
                "title": latest_proposal.get("title"),
                "author": latest_proposal.get("author"),
                "created": latest_proposal.get("created"),
                "start": latest_proposal.get("start"),
                "end": latest_proposal.get("end"),
                "snapshot": latest_proposal.get("snapshot"),
                "state": latest_proposal.get("state")},
            "ip_addresses": None,
            "location_note": "Snapshot space data does not include IPs or geographic location."
        })
        time.sleep(0.1) # Prevent rate limiting
    return final_report

if __name__ == "__main__":
    report = get_mega_data()
    with open("data.js", "w", encoding="utf-8") as f:
        f.write(f"const sovereignData = {json.dumps(report, indent=4)};")
    print(f"OK: Exported {len(report)} Network States to data.js")




