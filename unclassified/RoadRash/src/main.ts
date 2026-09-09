import './style.css';
import { Game } from './game';

const container = document.getElementById('app')!;
const hudRoot = document.getElementById('hud')!;
new Game(container, hudRoot);
