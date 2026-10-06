const express = require("express");
const path = require("path");
const fs = require("fs");
const { parse } = require("csv-parse/sync");

const app = express();
const PORT = 3000;

const csvFilePath = path.join(
  __dirname,
  "data",
  "institutes.csv"
);

console.log("CSV PATH:", csvFilePath);


// ==============================
// READ CSV
// ==============================

function getInstitutes() {
  const csvData = fs.readFileSync(
    csvFilePath,
    "utf8"
  );

  const institutes = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true
  });

  return institutes;
}


// ==============================
// SCORE HELPER
// ==============================

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}


// ==============================
// 100 EDUCATOR SCORE
// ==============================

function calculateScore(institute) {

  let earnedPoints = 0;
  let availablePoints = 0;
  let evaluatedFactors = 0;

  // =================================
  // 1. STUDENT EXPERIENCE / 30
  // =================================

  const rating =
    Number(institute.rating) || 0;

  const reviews =
    Number(institute.reviews) || 0;

  if (rating > 0 || reviews > 0) {

    const ratingPoints =
      rating > 0
        ? (rating / 5) * 24
        : 0;

    const reviewPoints =
      reviews > 0
        ? Math.min(
            (Math.log10(reviews + 1) /
              Math.log10(1001)) * 6,
            6
          )
        : 0;

    earnedPoints +=
      Math.min(
        ratingPoints + reviewPoints,
        30
      );

    availablePoints += 30;
    evaluatedFactors++;
  }


  // =================================
  // 2. RESULTS / 30
  // =================================

  if (
    String(
      institute.result_data || ""
    ).trim() !== ""
  ) {

    const value =
      Math.min(
        Math.max(
          Number(
            institute.result_data
          ) || 0,
          0
        ),
        5
      );

    earnedPoints +=
      value * 6;

    availablePoints += 30;
    evaluatedFactors++;
  }


  // =================================
  // 3. FACULTY / 15
  // =================================

  if (
    String(
      institute.faculty_data || ""
    ).trim() !== ""
  ) {

    const value =
      Math.min(
        Math.max(
          Number(
            institute.faculty_data
          ) || 0,
          0
        ),
        5
      );

    earnedPoints +=
      value * 3;

    availablePoints += 15;
    evaluatedFactors++;
  }


  // =================================
  // 4. FACILITIES / 10
  // =================================

  if (
    String(
      institute.facility_data || ""
    ).trim() !== ""
  ) {

    const value =
      Math.min(
        Math.max(
          Number(
            institute.facility_data
          ) || 0,
          0
        ),
        5
      );

    earnedPoints +=
      value * 2;

    availablePoints += 10;
    evaluatedFactors++;
  }


  // =================================
  // 5. VALUE FOR MONEY / 10
  // =================================

  if (
    institute.is_free === "true"
  ) {

    earnedPoints += 10;
    availablePoints += 10;
    evaluatedFactors++;

  } else if (
    String(
      institute.value_data || ""
    ).trim() !== ""
  ) {

    const value =
      Math.min(
        Math.max(
          Number(
            institute.value_data
          ) || 0,
          0
        ),
        5
      );

    earnedPoints +=
      value * 2;

    availablePoints += 10;
    evaluatedFactors++;

  } else if (
    String(
      institute.fees || ""
    ).trim() !== ""
  ) {

    earnedPoints += 5;
    availablePoints += 10;
    evaluatedFactors++;
  }


  // =================================
  // 6. VERIFIED / 5
  // =================================

  earnedPoints +=
    institute.verified === "true"
      ? 5
      : 0;

  availablePoints += 5;


  // =================================
  // NORMALIZE AVAILABLE INFORMATION
  // =================================

  const finalScore =
    availablePoints > 0
      ? (
          earnedPoints /
          availablePoints
        ) * 100
      : 0;


  return {

    score:
      Math.round(
        Math.min(
          Math.max(
            finalScore,
            0
          ),
          100
        )
      ),

    evaluatedFactors,

    totalFactors: 5,

    provisional:
      evaluatedFactors < 5
  };
}


// ==============================
// EJS SETUP
// ==============================

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(
    __dirname,
    "views"
  )
);


// ==============================
// PUBLIC FOLDER
// ==============================

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


// ==============================
// HOME PAGE
// ==============================

app.get("/", (req, res) => {

  const institutes =
    getInstitutes();


  institutes.forEach(
    (institute) => {

      const scoreData =
        calculateScore(
          institute
        );

      institute.score =
        scoreData.score;

      institute.scoreProvisional =
        scoreData.provisional;

      institute.evaluatedFactors =
        scoreData.evaluatedFactors;

      institute.totalFactors =
        scoreData.totalFactors;

    }
  );


  institutes.sort(
    (a, b) =>
      b.score - a.score
  );


  const governmentInstitutes =
    institutes.filter(
      institute =>
        institute.type ===
        "government"
    );


  const privateInstitutes =
    institutes.filter(
      institute =>
        institute.type ===
        "private"
    );


  console.log(
    "FIRST INSTITUTE:",
    institutes[0]
  );


  res.render(
    "home",
    {

      institutes,

      governmentInstitutes,

      privateInstitutes

    }
  );

});


// ==============================
// EXPLORE
// ==============================

app.get(
  "/explore",
  (req, res) => {

    const skill =
      (req.query.skill || "")
        .trim();

    const location =
      (req.query.location || "")
        .trim();

    const category =
      (req.query.category || "")
        .trim();


    // ==============================
    // CATEGORY KEYWORDS
    // ==============================

    const categoryKeywords = {

      "competitive-exams": [
        "JEE",
        "NEET",
        "SSC",
        "UPSC",
        "UKPSC",
        "Banking",
        "IBPS",
        "CDS",
        "NDA",
        "Defence",
        "AFCAT",
        "SSB",
        "Railway",
        "RRB",
        "CLAT",
        "CUET",
        "CAT",
        "IPM"
      ],

      "government": [
        "Government Jobs",
        "UPSC",
        "UKPSC",
        "SSC",
        "Railway",
        "RRB",
        "Defence",
        "NDA",
        "CDS",
        "AFCAT"
      ],

      "banking": [
        "Banking",
        "IBPS",
        "Finance"
      ],

      "technology": [
        "Coding",
        "Computer",
        "IT Training",
        "Programming",
        "Technology"
      ],

      "ai-robotics": [
        "AI",
        "Artificial Intelligence",
        "Robotics",
        "Automation"
      ],

      "skill-development": [
        "Skill Development",
        "Career Skills",
        "Computer Skills",
        "IT Training"
      ],

      "vocational": [
        "Vocational",
        "Technical Training",
        "Skill Training"
      ],

      "career": [
        "Career Skills",
        "Career",
        "Professional Skills",
        "Entrepreneurship"
      ]

    };


    const institutes =
      getInstitutes();


    // ==============================
    // TEXT NORMALIZER
    // ==============================

    function normalizeText(text) {

      return String(
        text || ""
      )
        .toLowerCase()
        .replace(
          /&/g,
          " and "
        )
        .replace(
          /[^a-z0-9\s]/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    }


    // ==============================
    // CLEAN WORDS
    // ==============================

    function cleanWords(
      text,
      wordsToRemove = []
    ) {

      return normalizeText(
        text
      )
        .split(" ")
        .filter(
          word =>
            word &&
            !wordsToRemove.includes(
              word
            )
        );

    }


    // ==============================
    // CATEGORY MATCHING
    // ==============================

    function matchesCategory(
      institute
    ) {

      if (!category) {
        return true;
      }


      const keywords =
        categoryKeywords[
          category
        ];


      if (!keywords) {
        return true;
      }


      const searchText =
        normalizeText([

          institute.name,

          institute.course,

          institute.category,

          institute.skills

        ]
          .filter(Boolean)
          .join(" "));


      return keywords.some(
        keyword =>
          searchText.includes(
            normalizeText(
              keyword
            )
          )
      );

    }


    // ==============================
    // SKILL MATCHING
    // ==============================

    function matchesSkill(
      institute
    ) {

      if (!skill) {
        return true;
      }


      const searchText =
        normalizeText([

          institute.name,

          institute.course,

          institute.category,

          institute.skills

        ]
          .filter(Boolean)
          .join(" "));


      const skillWords =
        cleanWords(
          skill,
          [
            "coaching",
            "coach",
            "classes",
            "class",
            "course",
            "courses",
            "training",
            "institute",
            "academy",
            "learn",
            "learning"
          ]
        );


      if (
        skillWords.length === 0
      ) {
        return true;
      }


      const fullSkill =
        normalizeText(
          skill
        );


      if (
        fullSkill &&
        searchText.includes(
          fullSkill
        )
      ) {
        return true;
      }


      return skillWords.every(
        word =>
          searchText.includes(
            word
          )
      );

    }


    // ==============================
    // LOCATION MATCHING
    // ==============================

    function getLocationMatch(
      institute
    ) {

      if (!location) {

        return {
          matched: true,
          level: 0
        };

      }


      const locationWords =
        cleanWords(
          location,
          [
            "near",
            "nearby",
            "around",
            "close",
            "closeby",
            "area",
            "road",
            "street"
          ]
        );


      if (
        locationWords.length === 0
      ) {

        return {
          matched: true,
          level: 0
        };

      }


      const city =
        normalizeText(
          institute.city
        );

      const area =
        normalizeText(
          institute.area
        );

      const address =
        normalizeText(
          institute.address
        );


      const fullLocationText =
        normalizeText([

          institute.city,

          institute.area,

          institute.address

        ]
          .filter(Boolean)
          .join(" "));


      const fullSearch =
        normalizeText(
          location
        );


      // Exact full address/city-area phrase

      if (
        fullSearch &&
        fullLocationText.includes(
          fullSearch
        )
      ) {

        return {
          matched: true,
          level: 3
        };

      }


      // All requested location words

      const allWordsMatch =
        locationWords.every(
          word =>
            fullLocationText.includes(
              word
            )
        );


      if (!allWordsMatch) {

        return {
          matched: false,
          level: 0
        };

      }


      // Area match

      const areaMatch =
        locationWords.every(
          word =>
            area.includes(
              word
            )
        );


      if (areaMatch) {

        return {
          matched: true,
          level: 3
        };

      }


      // Address match

      const addressMatch =
        locationWords.every(
          word =>
            address.includes(
              word
            )
        );


      if (addressMatch) {

        return {
          matched: true,
          level: 2
        };

      }


      // City match

      const cityMatch =
        locationWords.every(
          word =>
            city.includes(
              word
            )
        );


      if (cityMatch) {

        return {
          matched: true,
          level: 1
        };

      }


      // Words exist across fields

      return {
        matched: true,
        level: 1
      };

    }


    // ==============================
    // FILTER INSTITUTES
    // ==============================

    const filteredInstitutes =
      institutes

        .filter(
          institute => {

            // Don't show closed institutes

            if (
              String(
                institute.status || ""
              )
                .toLowerCase() ===
              "closed"
            ) {

              return false;

            }


            const skillMatch =
              matchesSkill(
                institute
              );


            const categoryMatch =
              matchesCategory(
                institute
              );


            const locationMatch =
              getLocationMatch(
                institute
              );


            return (
              skillMatch &&
              categoryMatch &&
              locationMatch.matched
            );

          }
        )


        // ==============================
        // ADD SCORE + LOCATION RELEVANCE
        // ==============================

        .map(
          institute => {

            const scoreData =
              calculateScore(
                institute
              );


            const locationMatch =
              getLocationMatch(
                institute
              );


            return {

              ...institute,

              score:
                scoreData.score,

              scoreProvisional:
                scoreData.provisional,

              evaluatedFactors:
                scoreData.evaluatedFactors,

              totalFactors:
                scoreData.totalFactors,

              locationLevel:
                locationMatch.level

            };

          }
        )


        // ==============================
        // FINAL RANKING
        // ==============================

        .sort(
          (a, b) => {

            // 1. Better location match

            if (
              b.locationLevel !==
              a.locationLevel
            ) {

              return (
                b.locationLevel -
                a.locationLevel
              );

            }


            // 2. Higher score

            if (
              b.score !==
              a.score
            ) {

              return (
                b.score -
                a.score
              );

            }


            // 3. More complete data

            return (
              b.evaluatedFactors -
              a.evaluatedFactors
            );

          }
        );


    // ==============================
    // RENDER RESULTS
    // ==============================

    res.render(
      "explore",
      {

        skill,

        location,

        filteredInstitutes

      }
    );

  }
);


// ==============================
// CATEGORIES
// ==============================

app.get(
  "/categories",
  (req, res) => {

    res.render(
      "categories"
    );

  }
);


// ==============================
// FOR INSTITUTES
// ==============================

app.get(
  "/institutes",
  (req, res) => {

    res.render(
      "institutes"
    );

  }
);


// ==============================
// ABOUT
// ==============================

app.get(
  "/about",
  (req, res) => {

    res.render(
      "about"
    );

  }
);


// ==============================
// INDIVIDUAL INSTITUTE
// ==============================

app.get(
  "/institute/:name",
  (req, res) => {

    const institutes =
      getInstitutes();


    const institute =
      institutes.find(
        item =>
          item.name.toLowerCase() ===
          req.params.name.toLowerCase()
      );


    if (!institute) {

      return res
        .status(404)
        .send(
          "Institute not found"
        );

    }


    const scoreData =
      calculateScore(
        institute
      );


    institute.score =
      scoreData.score;

    institute.scoreProvisional =
      scoreData.provisional;

    institute.evaluatedFactors =
      scoreData.evaluatedFactors;

    institute.totalFactors =
      scoreData.totalFactors;


    res.render(
      "institute",
      {
        institute
      }
    );

  }
);


// ==============================
// START SERVER
// ==============================

app.listen(
  PORT,
  () => {

    console.log(
      `100 Educator running at http://localhost:${PORT}`
    );

  }
);