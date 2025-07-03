import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home';
import Login from '../screens/Login';
import Signup from '../screens/Signup';
import Dashboard from '../screens/Dashboard';
import BuyPower from '../screens/BuyPower';
import RelayControlScreen from '../screens/RelayControlScreen';
import PowerConsumptionScreen from '../screens/PowerConsumptionScreen';
import MeterReportScreen from '../screens/MeterReportScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="PowerConsumption" component={PowerConsumptionScreen} />
      <Stack.Screen name="BuyPower" component={BuyPower} />
      <Stack.Screen name="RelayControlScreen" component={RelayControlScreen} />
      <Stack.Screen name="MeterReportScreen" component={MeterReportScreen}/>
    </Stack.Navigator>
  );
}