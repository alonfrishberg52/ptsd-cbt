import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Custom escape icon component
const EscapeIcon = ({ width = 30, height = 37, color = "black" }) => (
  <Svg width={width} height={height} viewBox="0 0 30 37" fill="none">
    <Path d="M8 17.5C7.44772 17.5 7 17.9477 7 18.5C7 19.0523 7.44772 19.5 8 19.5L8 17.5ZM22.7071 19.2071C23.0976 18.8166 23.0976 18.1834 22.7071 17.7929L16.3431 11.4289C15.9526 11.0384 15.3195 11.0384 14.9289 11.4289C14.5384 11.8195 14.5384 12.4526 14.9289 12.8431L20.5858 18.5L14.9289 24.1569C14.5384 24.5474 14.5384 25.1805 14.9289 25.5711C15.3195 25.9616 15.9526 25.9616 16.3431 25.5711L22.7071 19.2071ZM8 18.5L8 19.5L22 19.5L22 18.5L22 17.5L8 17.5L8 18.5Z" fill={color}/>
    <Path d="M10 8H2V29H10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export default EscapeIcon; 