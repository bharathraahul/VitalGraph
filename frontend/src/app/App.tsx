import { PlantScreen } from './components/PlantScreen';
import { MobileContainer } from './components/MobileContainer';

export default function App() {
  return (
    <div className="size-full flex items-center justify-center bg-gray-900">
      <MobileContainer>
        <PlantScreen />
      </MobileContainer>
    </div>
  );
}