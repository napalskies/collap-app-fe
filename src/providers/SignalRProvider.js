import { useEffect, useRef, createContext, useState } from 'react';

import { HubConnectionBuilder } from '@microsoft/signalr';

const SignalRContext = createContext(null);

function SignalRProvider({children}) {
  
  const connectionRef = useRef(null);
  const [ connectionReady, setConnectionReady ] = useState(null);

  if(!connectionRef.current) {
        connectionRef.current = new HubConnectionBuilder()
          .withUrl("https://localhost:5200/documentHub")
          .withAutomaticReconnect()
          .build();
        }
      


  const connection = connectionRef.current;

  useEffect(() => {
    async function onStart() {
      if(connection && connection.state === "Disconnected" && !connectionReady) {
        const startPromise = connection.start()
                                          .then(() => console.log("SignalR connected"))
                                          .catch(err => console.error("Connection failed:", err));
        setConnectionReady(startPromise);
      }
    };
    onStart();
  }, [connection, connectionReady]);

  return (
    <SignalRContext.Provider value={{connectionContext: connection, connectionReady: connectionReady}}>
      {children}
    </SignalRContext.Provider>
  );
}

export default SignalRProvider;
export { SignalRContext };