import React from 'react';
import {registerRoot, Still} from 'remotion';
import {ArtLab} from './ArtLab';

const Lab: React.FC = () => React.createElement(Still, {id: 'ArtLab', component: ArtLab, width: 1880, height: 1420});
registerRoot(Lab);
