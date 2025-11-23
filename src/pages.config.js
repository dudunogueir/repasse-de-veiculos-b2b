import Home from './pages/Home';
import Advertise from './pages/Advertise';
import VehicleDetails from './pages/VehicleDetails';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Advertise": Advertise,
    "VehicleDetails": VehicleDetails,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};