import React, { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';

import { debounce } from 'lodash';
import { SignalRContext } from '../providers/SignalRProvider';

function DocumentComponent(props) {
    const {connectionContext, connectionReady} = useContext(SignalRContext);
    const documentId = props.documentId;
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        async function initInput() {
            await axios.get(`https://localhost:5200/api/document/${documentId}`)
            .then(response => {setInputText(response.data.content)});
        };
        initInput();
    }, [documentId]);
    
    useEffect(() => {

        if (!connectionContext || !connectionReady) return;

        const joinWhenConnected = async () => {
            await connectionReady;
            if(connectionContext.state === "Connected") {
                console.log(connectionContext.state);
                await connectionContext.invoke("JoinDocument", documentId);
            }
            console.log(connectionReady, connectionContext.state);
        };

        joinWhenConnected().catch(err => console.error("Error in invoking JoinDocument:", err));
    }, [connectionContext, documentId, connectionReady]);

    useEffect(() => {
        if(!connectionContext) return;

        const onReconnect = () => {
            if (connectionContext.state === "Connected") {
                connectionContext.invoke("JoinDocument", documentId).catch(err => console.error("JoinDocument failed:", err));
            }
        };

        connectionContext.on("reconnected", onReconnect);
        
        return() => {
            connectionContext.off("reconnected", onReconnect);
        }
    }, [connectionContext, documentId]);


 
  const handleDocumentChanged = useRef(
    debounce(async (newValue) => {
      try {
        console.log("Invoking SendChange with value: ", newValue);
        await connectionContext.invoke("SendChange", documentId, newValue)
      }
      catch (err) {
        console.error("Invoke failed: ", err);
      }
    }, 200),
  []);



  useEffect(() => {
    const debouncedFn = handleDocumentChanged.current;
    const onDocumentChanged = (change) => {console.log(change); setInputText(change)};
    const onUserConnected = (connectionId) => console.log(`User ${connectionId} connected!`);
    const onUserDisconnected = (connectionId) => console.log(`User ${connectionId} disconnected!`);
    connectionContext.on("DocumentChanged", onDocumentChanged);
    connectionContext.on("UserConnected", onUserConnected);
    connectionContext.on("UserDisconnected", onUserDisconnected);

    return () => {
      console.log("Cleaning up handlers");   
       
      debouncedFn.cancel();
       connectionContext.off("DocumentChanged", onDocumentChanged);//, onDocumentChanged);
       connectionContext.off("UserConnected", onUserConnected);
       connectionContext.off("UserDisconnected", onUserDisconnected);
    };
  }, [connectionContext]);

  return (
    <input value = {inputText} onChange={(e) => {setInputText(e.target.value); handleDocumentChanged.current(e.target.value)}}></input>
  );
}

export default DocumentComponent;