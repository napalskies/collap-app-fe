import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import { HubConnectionBuilder } from '@microsoft/signalr';

function App() {
  //const [connection, setConnection] = useState(null);
  let connectionSingleton = null;
  const connectionRef = useRef(null);
  const documentId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  const [inputText, setInputText] = useState('');

  const onUserConnected = (connectionId) => console.log(`User ${connectionId} connected!`);
  const onUserDisconnected = (connectionId) => console.log(`User ${connectionId} disconnected!`);
  useEffect(() => {
    async function initInput() {
     await axios.get(`https://localhost:5200/api/document/${documentId}`)
     .then(response => {setInputText(response.data.content)});
    };
    initInput();
  }, []);
  useEffect(() => {
    async function onStart() {
    if(!connectionSingleton) {
      connectionSingleton = new HubConnectionBuilder()
        .withUrl("https://localhost:5200/documentHub")
        .withAutomaticReconnect()
        .build();
      
      
      connectionSingleton.on("DocumentChanged", (change) => DocumentChanged(change));
      connectionSingleton.on("UserConnected", (connectionId) => onUserConnected(connectionId));
      connectionSingleton.on("UserDisconnected", (connectionId) => onUserDisconnected(connectionId));

      try {
        await connectionSingleton.start();
        console.log("SignalR works!");
        await connectionSingleton.invoke("JoinDocument", documentId);
      } 
      catch (err) {
        console.error("Connection failed: ", err);
      }
      
    }
  };
  onStart();
  connectionRef.current = connectionSingleton;
  // return() => {
  //   //remove handlers and stop connection to avoid duplicates on remount
  //   const connection=connectionRef.current;  
  //   try {
  //       connection.off("DocumentChanged", DocumentChanged);
  //       connection.off("UserConnected", onUserConnected);
  //       connection.off("UserDisconnected", onUserDisconnected);
  //     }
  //       finally {
  //       connection.stop();
  //       if (connectionRef.current === connection) {
  //         connectionRef.current = null;
  //       }
  //     }
  //   };
}, []);


 
  const handleDocumentChanged = async (newValue) => {
    const connection = connectionRef.current;
    if (!connection) {
      console.warn("No connection available");
      return;
    }
    try {
      setInputText(newValue); //-> daca comentez asta nu merge; need to findout why
      console.log("before invoking with "+newValue);
      await connection.invoke("SendChange", documentId, newValue);
      console.log("Invoked SendChange with " + newValue);
    } catch (err) {
      console.error("Invoke failed: ", err);
    }
  };
 
  const DocumentChanged = async (change) => {
    console.log("Backend invoked DocumentChange")
    console.log("it changed with change: "+change);
    setInputText(change);
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a> */}
        <input value = {inputText} onChange={(e) => {console.log("val "+e.target.value); handleDocumentChanged(e.target.value);}}></input>
        {/* <button onClick={handleDocumentChanged}>Click</button> */}
      </header>
    </div>
  );
}

export default App;
