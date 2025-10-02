import React from 'react';
import HomePage from './pages/HomePage';
import Callback from './pages/Callback';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;