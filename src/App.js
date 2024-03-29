import "./App.css";
import { useState } from "react";
import helper from "./helpers/helper";

function App() {
  const [xpath, setXPath] = useState(null);
  const [result, setResult] = useState(null);

  const convert = () => {
    try {
      setResult(helper.cssify(xpath));
    } catch (error) {
      alert("Input could not be converted");
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="app">
      <h2>xPath To Css Selector</h2>
      <div className="form">
        <textarea onChange={(e) => setXPath(e.target.value)}></textarea>
        <button onClick={convert}>Convert</button>
      </div>
      <div className="result">
        {result !== null && (
          <>
            <textarea onChange={(e) => setResult(e.target.value)}>
              {result}
            </textarea>
            <button className="btnCopy" onClick={copy}>
              Copy
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
