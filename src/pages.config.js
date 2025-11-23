import Home from './pages/Home';
import Advertise from './pages/Advertise';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Advertise": Advertise,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};