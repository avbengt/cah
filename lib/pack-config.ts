export type PackConfigEntry = {
  label: string;
  badgeClass?: string;
  badgeText?: string;
  badgeTextClass?: string;
  badgeImg?: string; // path to an image/SVG file to use as the badge
  badgeImgClass?: string; // overrides default size/position classes for badgeImg
};

// badgeClass: color + shape classes. Built-in shapes:
//   diamond  → "rotate-45"
//   circle   → "rounded-full"
//   square   → (no extra class)
//   triangle → "[clip-path:polygon(50%_0%,0%_100%,100%_100%)]"
export const packConfig: Record<string, PackConfigEntry> = {
  // Box expansions
  "CAH: Red Box Expansion": { label: "Red Box", badgeClass: "bg-red-500 rotate-50 !w-[5px] !h-[5px]" },
  "CAH: Green Box Expansion": { label: "Green Box", badgeClass: "bg-green-500 rounded-full !w-[5px] !h-[5px]" },
  "CAH: Blue Box Expansion": { label: "Blue Box", badgeClass: "bg-blue-500 rotate-10 [clip-path:polygon(50%_0%,0%_100%,100%_100%)] bottom-[10px] !right-[4px] !w-[6px] !h-[6px]" },
  "Absurd Box Expansion": { label: "Absurd Box", badgeImg: "/images/icons/icon-absurd.svg", badgeImgClass: "w-[7px] h-[7px] bottom-[10px] !right-[4px]" },
  "CAH: Box Expansion": { label: "Box" },

  // Base / main decks
  "CAH Base Set": { label: "Base Set" },
  "CAH: Main Deck": { label: "Main Deck" },

  // Numbered expansions
  "CAH: First Expansion": { label: "1st Expansion", badgeText: "1" },
  "CAH: Second Expansion": { label: "2nd Expansion", badgeText: "2", badgeTextClass: "translate-x-px" },
  "CAH: Third Expansion": { label: "3rd Expansion", badgeText: "3" },
  "CAH: Fourth Expansion": { label: "4th Expansion", badgeText: "4" },
  "CAH: Fifth Expansion": { label: "5th Expansion", badgeText: "5" },
  "CAH: Sixth Expansion": { label: "6th Expansion", badgeText: "6" },

  // Holiday / seasonal
  "2012 Holiday Pack": { label: "Holiday '12" },
  "2013 Holiday Pack": { label: "Holiday '13" },
  "2014 Holiday Pack": { label: "Holiday '14" },
  "Seasons Greetings Pack": { label: "Seasons Greetings" },

  // Nostalgia
  "90s Nostalgia Pack": { label: "90s Nostalgia", badgeImg: "/images/icons/icon-90s.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "CAH: 2000s Nostalgia Pack": { label: "2000s Nostalgia", badgeImg: "/images/icons/icon-2000s.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },

  // Themed packs
  "CAH: A.I. Pack": { label: "A.I.", badgeImg: "/images/icons/icon-ai.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "CAH: Ass Pack": { label: "Ass Pack", badgeImg: "/images/icons/icon-ass.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "CAH: College Pack": { label: "College", badgeImg: "/images/icons/icon-college.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "CAH: Human Pack": { label: "Human Pack", badgeImg: "/images/icons/icon-human.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "CAH: Procedurally-Generated Cards": { label: "Procedural" },
  "CAH: Hidden Gems Bundle: A Few New Cards We Crammed Into This Bundle Pack (Amazon Exclusive)": { label: "Hidden Gems" },
  "Dad Pack": { label: "Dad Pack", badgeImg: "/images/icons/icon-dad.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Fantasy Pack": { label: "Fantasy", badgeImg: "/images/icons/icon-fantasy.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Food Pack": { label: "Food", badgeImg: "/images/icons/icon-food.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Geek Pack": { label: "Geek", badgeImg: "/images/icons/icon-geek.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Period Pack": { label: "Period", badgeImg: "/images/icons/icon-period.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Pride Pack": { label: "Pride", badgeImg: "/images/icons/icon-pride.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Sci-Fi Pack": { label: "Sci-Fi", badgeImg: "/images/icons/icon-sci-fi.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Science Pack": { label: "Science", badgeImg: "/images/icons/icon-science.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Weed Pack": { label: "Weed", badgeImg: "/images/icons/icon-weed.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "World Wide Web Pack": { label: "World Wide Web", badgeImg: "/images/icons/icon-www.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },

  // Conversion kits
  "CAH: Canadian Conversion Kit": { label: "Canadian Kit" },
  "CAH: UK Conversion Kit": { label: "UK Kit" },

  // Special / charity / event
  "CAH: Family Edition (Free Print & Play Public Beta)": { label: "Family Edition" },
  "Desert Bus For Hope Pack": { label: "Desert Bus" },
  "Trump Bug Out Bag/Post-Trump Pack": { label: "Post-Trump" },

  // Collab / licensed
  "ClickHole Greeting Cards Pack (Target Exclusive)": { label: "ClickHole" },
  "House of Cards Pack": { label: "House of Cards" },
  "Jew Pack/Chosen People Pack": { label: "Chosen People", badgeImg: "/images/icons/icon-jew.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },
  "Nerd Bundle: A Few More Cards For You Nerds (Target Exclusive)": { label: "Nerd Bundle" },
  "TableTop Pack": { label: "TableTop" },
  "Theatre Pack": { label: "Theatre", badgeImg: "/images/icons/icon-theatre.svg", badgeImgClass: "w-[8px] h-[8px] bottom-[10px] !right-[4px] rotate-10" },

  // PAX
  "PAX 2010 \"Oops\" Kit": { label: "PAX 2010" },
  "PAX East 2013 Promo Pack A": { label: "PAX East '13 A" },
  "PAX East 2013 Promo Pack B": { label: "PAX East '13 B" },
  "PAX East 2013 Promo Pack C": { label: "PAX East '13 C" },
  "PAX East 2014": { label: "PAX East '14" },
  "PAX East 2014 - Panel Cards": { label: "PAX East '14 Panel" },
  "PAX Prime 2013": { label: "PAX Prime '13" },
  "PAX Prime 2014 - Panel Cards": { label: "PAX Prime '14 Panel" },
  "PAX Prime 2015 Food Pack A (Mango)": { label: "PAX '15 Mango" },
  "PAX Prime 2015 Food Pack B (Coconut)": { label: "PAX '15 Coconut" },
  "PAX Prime 2015 Food Pack C (Cherry)": { label: "PAX '15 Cherry" },

  // Reject / retail
  "Reject Pack": { label: "Reject" },
  "Reject Pack 2": { label: "Reject 2" },
  "Reject Pack 3": { label: "Reject 3" },
  "Retail Mini Pack": { label: "Retail Mini" },
  "Retail Product Pack": { label: "Retail Product" },

  // Gen Con
  "Gen Con 2018 Midterm Election Pack": { label: "Gen Con 2018" },
};
