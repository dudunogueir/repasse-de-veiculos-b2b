import Home from './pages/Home';
import Advertise from './pages/Advertise';
import VehicleDetails from './pages/VehicleDetails';
import MyAds from './pages/MyAds';
import EditVehicle from './pages/EditVehicle';
import Favorites from './pages/Favorites';
import Chat from './pages/Chat';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Advertise": Advertise,
    "VehicleDetails": VehicleDetails,
    "MyAds": MyAds,
    "EditVehicle": EditVehicle,
    "Favorites": Favorites,
    "Chat": Chat,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};