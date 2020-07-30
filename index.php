<!doctype html>
<html lang="en">
  <head>
    <meta name="format-detection" content="telephone=no"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>HTML5 geolocation with Services_OpenStreetMap</title>
    <style type="text/css">
        html, body, #basicMap {
            width: 360;
            height: 320;
            margin: 10;
        }
        #map { height: 600px; }
    </style>
    <!-- DESPÚES PASAR LOS ESTILOS AL ARCHIVO CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css" />  
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
    <script src="jquery-1.8.2.js"></script>
    <script src="https://unpkg.com/leaflet@1.6.0/dist/leaflet.js"></script>

    <!-- LIBRERÍA PARA MOSTRAR E INTERACTUAR CON EL MAPA-->

  </head>

  <body>
    <div id="map"></div>
    <div id="botonBar1">
        <button id="botonCargarPuntos">
            MOSTRAR RUTAS
        </button>
        <button id="botonMostrarMatrizDistancia">
            MOSTRAR MATRIZ DISTANCIAS
        </button>
    </div>
  </body>
        
<script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
<script src="js/script.js"></script>

</html>


