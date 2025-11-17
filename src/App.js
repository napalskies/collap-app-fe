//import React, { useCallback, useEffect, useMemo, useRef, useState, setContext } from 'react';
import './App.css';
// import axios from 'axios';
// import { HubConnectionBuilder } from '@microsoft/signalr';
// import { debounce } from 'lodash';
import DocumentComponent from './components/DocumentComponent';
import SignalRProvider from './providers/SignalRProvider';

function App() {
   const documentId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
  return (
    <div className="App">
      <header className="App-header">
          <SignalRProvider>
              <DocumentComponent documentId={documentId}/>
              <DocumentComponent documentId={'c6f9dee8-2655-4db6-8460-c794a6e817cf'}/>
            </SignalRProvider>
      </header>
    </div>
  );
}

export default App;
