import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-emerald-600 mb-4">MaketGroup</h1>
        <p className="text-gray-600 mb-6">
          L'application a été migrée vers un backend PHP. 
          Vous pouvez accéder à la nouvelle version via le lien ci-dessous.
        </p>
        <a 
          href="/maketgroup/index.php" 
          className="inline-block bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
        >
          Accéder à MaketGroup (PHP)
        </a>
      </div>
    </div>
  );
}

export default App;
