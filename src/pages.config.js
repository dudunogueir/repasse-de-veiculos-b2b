import Home from './pages/Home';
import Advertise from './pages/Advertise';
import VehicleDetails from './pages/VehicleDetails';
import MyAds from './pages/MyAds';
import Favorites from './pages/Favorites';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Proposals from './pages/Proposals';
import Notifications from './pages/Notifications';
import AlertPreferences from './pages/AlertPreferences';
import Plans from './pages/Plans';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Home": Home,
    "Advertise": Advertise,
    "VehicleDetails": VehicleDetails,
    "MyAds": MyAds,
    "Favorites": Favorites,
    "Chat": Chat,
    "Profile": Profile,
    "Admin": Admin,
    "Dashboard": Dashboard,
    "Proposals": Proposals,
    "Notifications": Notifications,
    "AlertPreferences": AlertPreferences,
    "Plans": Plans,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};