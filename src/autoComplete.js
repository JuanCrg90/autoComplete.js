import { generateList, closeAllLists } from "./controllers/listController";
import { navigate } from "./controllers/navigationController";
import {
  prepareData,
  getInputValue,
  prepareQueryValue,
  checkTriggerCondition,
  listMatchingResults,
} from "./controllers/dataController";
import debouncer from "./utils/debounce";
import eventEmitter from "./utils/eventEmitter";

export default class autoComplete {
  constructor(config) {
    // Deconstructing config values
    const {
      selector = "#autoComplete", // User input selector
      data: {
        src, // Data src selection
        key, // Data src key selection
        cache = true, // Flag to cache data src
      },
      query, // Query interceptor function
      trigger: {
        event = ["input"], // autoCompleteJS event
        condition = false, // condition trigger
      } = {},
      searchEngine = "strict", // Search engine type
      threshold = 0, // Minimum characters length before engine starts rendering
      debounce = 0, // Minimum duration for API calls debounce
      resultsList: {
        render = true,
        container = false,
        destination, // Results list selector
        position = "afterend", // Results list position
        element: resultsListElement = "ul", // Results list element tag
        navigation = false, // Results list navigation
      } = {},
      sort = false, // Sorting results list
      placeHolder, // Placeholder text
      maxResults = 5, // Maximum number of results to show
      resultItem: {
        content = false, // Result item function
        element: resultItemElement = "li", // Result item element tag
      } = {},
      noResults, // No results action
      highlight = false, // Highlighting matching results
      feedback, // Data feedback
      onSelection, // Action function on result selection
    } = config;

    // Assigning config values to properties
    this.inputField = selector;
    this.data = {
      src: () => (typeof src === "function" ? src() : src),
      key,
      cache,
    };
    this.query = query;
    this.trigger = {
      event,
      condition,
    };
    this.searchEngine = searchEngine;
    this.threshold = threshold;
    this.debounce = debounce;
    this.resultsList = {
      render,
      container,
      destination: destination || this.inputField,
      position,
      element: resultsListElement,
      navigation,
    };
    this.sort = sort;
    this.placeHolder = placeHolder;
    this.maxResults = maxResults;
    this.resultItem = {
      content,
      element: resultItemElement,
    };
    this.noResults = noResults;
    this.highlight = highlight;
    this.feedback = feedback;
    this.onSelection = onSelection;
    // Invoking preInit automatically
    // when autoCompleteJS instance gets initiated
    this.preInit();
  }

  // Run autoCompleteJS processes
  run(event, inputField, data) {
    // 0- Close all open lists
    closeAllLists(false, inputField);
    // 1- Prepare input values
    const inputValue = getInputValue(inputField);
    const queryValue = prepareQueryValue(this.query, inputValue);
    // 2- Get trigger condition
    const triggerCondition = checkTriggerCondition(this.trigger, queryValue, this.threshold);
    // 3- Check triggering condition
    if (triggerCondition) {
      // 4- Search engine configurations
      const searchConfig = {
        searchEngine: this.searchEngine,
        highlight: this.highlight,
        key: this.data.key,
        sort: this.sort,
        maxResults: this.maxResults,
      };
      // 5- Match query with existing value
      const searchResults = listMatchingResults(inputValue, data, searchConfig);
      // 6- Emit Event on input
      eventEmitter(inputField, { inputValue, queryValue, searchResults: searchResults }, "autoCompleteJS_input");
      // 7- Checks if there are NO results
      // Runs noResults action function
      if (!data.length) return this.noResults();
      // 8- If resultsList set not to render
      if (!this.resultsList.render) return this.feedback(searchResults);
      // 9- Generate & Render results list
      generateList(searchResults.list, event, this.onSelection);
      // 10- Initialize navigation
      navigate(inputField);
      // 11- Listen for all clicks in the document
      document.addEventListener("click", (event) => {
        // 12- Close this menu if clicked
        // outside the menu and input field
        closeAllLists(event.target, inputField);
      });
    }
  }

  // Initialization stage
  init() {
    // If data source
    // set to be cached
    if (this.data.cache) {
      // 1- Prepare the data
      debouncer(
        prepareData(this.data.src(), (data) => {
          // Set placeholder attribute value
          if (this.placeHolder) this.inputField.setAttribute("placeholder", this.placeHolder);
          // 2- Listen for all clicks in the input field
          this.inputField.addEventListener("input", (event) => {
            // 3- Initialize autoCompleteJS processes
            this.run(event, this.inputField, data);
          });
        }),
        this.debounce
      );
      // Else if data source
      // set to be streamlined
    } else {
      // Set placeholder attribute value
      if (this.placeHolder) this.inputField.setAttribute("placeholder", this.placeHolder);
      // 1- Listen for all clicks in the input field
      this.inputField.addEventListener(
        "input",
        debouncer((event) => {
          // 2- Prepare the data
          prepareData(this.data.src(), (data) => {
            // 3- Initialize autoCompleteJS processes
            this.run(event, this.inputField, data);
          });
        }, this.debounce)
      );
    }
  }

  // Pre-Initialization stage
  preInit() {
    // Observe DOM changes
    // The entire document will be observed for mutations
    const targetNode = document;
    // Options for the observer (which mutations to observe)
    const config = { childList: true, subtree: true };
    // Callback function to execute when mutations are observed
    const callback = (mutationsList, observer) => {
      // Traditional 'for loops' for IE 11
      for (let mutation of mutationsList) {
        // Check if this is the selected input field
        if (document.querySelector(this.inputField)) {
          // If yes disconnect the observer
          observer.disconnect();
          // Assign the input field selector
          this.inputField = document.querySelector(this.inputField);
          // Emit Event on connection
          eventEmitter(this.inputField, { mutation }, "autoCompleteJS_connect");
          // Initiate autoCompleteJS
          this.init();
        }
      }
    };
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  }
}
