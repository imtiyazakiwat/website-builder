// const form = document.querySelector("#generate-form");
// const spinner = document.querySelector("#spinner");
// const generateButton = document.querySelector("#generate-button");

// form.addEventListener("submit", async (event) => {
//   event.preventDefault();
//   spinner.classList.remove("hidden"); // show the spinner
//   generateButton.classList.add("hidden"); // hide the generate button

//   const userInput = document.querySelector("#user-input").value;

//   // Send request to OpenAI API
//   const response = await fetch("https://api.openai.com/v1/engines/text-davinci-003/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Authorization": "Bearer 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"
//     },
//     body: JSON.stringify({
//       prompt: userInput + ",write beautiful html using bootstrap classes, use images from unsplash, add navbar, hero section, footer ",
//       temperature: 0.7,
//       max_tokens: 900,
//       top_p: 1,
//       frequency_penalty: 0,
//       presence_penalty: 0
//     })
//   });

//   const data = await response.json();

//   // Create link to HTML file
//   const html = data.choices[0].text;
//   const file = new Blob([html], {type: "text/html"});
//   const url = URL.createObjectURL(file);
//   const link = document.createElement("a");
//   link.href = url;
//   link.target = "_blank";
//   link.innerHTML = "Open your beautifull website";
//   document.body.appendChild(link);

//   // Hide the spinner and show the generate button
//   spinner.classList.add("hidden");
//   generateButton.classList.remove("hidden");
// });

const form = document.querySelector("#generate-form");
const spinner = document.querySelector("#spinner");
const container = document.querySelector("#generated-html-container");
const generateButton = document.querySelector("#generate-button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  spinner.classList.remove("d-none"); // show the spinner
  generateButton.classList.add("d-none"); // hide the generate button

  const userInput = document.querySelector("#user-input").value;

  // Send request to OpenAI API
  const response = await fetch("https://api.openai.com/v1/engines/text-davinci-003/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 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"
    },
    body: JSON.stringify({
      prompt: userInput + ",write beautiful html using bootstrap classes, use images from unsplash, add navbar, hero section, footer ",
      temperature: 0.7,
      max_tokens: 900,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    })
  });

  const data = await response.json();

  // Create button to open HTML file
  const html = data.choices[0].text;
  const file = new Blob([html], {type: "text/html"});
  const url = URL.createObjectURL(file);
  const button = document.createElement("button");
  button.classList.add("btn", "btn-primary");
  button.innerHTML = "Open website";
  button.addEventListener("click", () => {
    window.open(url, "_blank");
  });
  container.innerHTML = ""; // clear any previous content in container
  container.appendChild(button);

  // Hide the spinner and show the generate button
  spinner.classList.add("d-none");
  generateButton.classList.remove("d-none");
});