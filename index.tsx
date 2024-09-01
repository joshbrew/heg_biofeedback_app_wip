import React from 'react';
import { createRoot } from 'react-dom/client'


import './styles/bootstrap.min.css'
import './styles/index.css'
import { App } from './components/app';
import { createDeviceSelector } from './scripts/connect';





async function main() {

    let root = createRoot(document.getElementById("root"));

    root.render(
        <App/>
    );

    createDeviceSelector();
}


main();