var map 
var coords 
var puntos = []
var marcas = []
var segmentos = []  
var distancias = []
var matrizDistancias = []
var matrizId = 0
var capas = []
var capaPosiblesRutas = null
var pilaClientes = []
var pin = L.icon({
    iconUrl: 'pin.png',
    iconSize: [35, 35],
    iconArchor: [17,36]
});
var iconoDeposito = L.icon({
    iconUrl: 'store-icon.png',
    iconSize: [35, 35],
    iconArchor: [17,36]
});
const coordSalta = [-24.7892, -65.4106]
coords = null;


var router = new L.Routing.osrmv1({serviceUrl: 'http://localhost:7000/route/v1'})
map = L.map('map').setView(coordSalta, 14);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 18 }).addTo(map);

cantidadClientes = 1

function crearMarca(ev){
    coord= ev.latlng
    lat = coord.lat
    lng = coord.lng

    if(cantidadClientes==1){
        marca = L.marker([lat, lng], {icon: iconoDeposito}).addTo(map);
        marcas.push(marca)
        marca.bindPopup("Deposito").openPopup();
        puntos.push({nodo: cantidadClientes,coordenadas:coord})
        agregarClienteTabla(cantidadClientes,"Latitud: "+lat+" Longitud: "+lng+0,0)
        pilaClientes.push(cantidadClientes)
    }
    else{
        marca = L.marker([lat, lng], {icon: pin}).addTo(map);
        marca.bindPopup("Cliente "+cantidadClientes).openPopup();
        marcas.push(marca)
        puntos.push({nodo: cantidadClientes,coordenadas:coord})
        agregarClienteTabla(cantidadClientes,"Latitud: "+lat+" Longitud: "+lng+0,1)
        pilaClientes.push(cantidadClientes)
    }
    cantidadClientes++ 
}
map.addEventListener("click",crearMarca)  





function ocultarInstrucciones(){
    document.querySelector(".leaflet-right").style = "display: none";
}




function RGB2HTML(red, green, blue)
{
    var decColor =0x1000000+ blue + 0x100 * green + 0x10000 *red ;
    return '#'+decColor.toString(16).substr(1); 
}

function random(max) {
    return Math.floor(Math.random() * max);
}



async function enviarMatrizDistancias(){
    nroVehiculos = document.querySelector("#inputNroVehiculos").value
    capacidadMax = document.querySelector("#inputCapacidadMax").value
    console.log("se está por enviar "+"data="+JSON.stringify(puntos)+"&nroVehiculos="+nroVehiculos+"&capacidadMax="+capacidadMax+"&demandas="+JSON.stringify(obtenerDemandas()))
    jsonRutas = await fetch("http://localhost:5000/post", {
        body: "data="+JSON.stringify(puntos)+"&nroVehiculos="+nroVehiculos+"&capacidadMax="+capacidadMax+"&demandas="+JSON.stringify(obtenerDemandas()),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      })
    rutas = await jsonRutas.json()
    rutas.costoAsociado = parseFloat(rutas.costoAsociado)
    rutas.rutas = JSON.parse(rutas.rutas)
    return Promise.resolve(rutas)
}

//Agrega un cliente a la tabla de clientes
function agregarClienteTabla(cli,co,d){
    fila = document.createElement("tr")
    cliente = document.createElement("td")
    coord = document.createElement("td")
    dem = document.createElement("input")
    dem.type = "number"
    dem.value= d
    dem.min = 0
    dem.id = "dem"+String(cli)
    
    cliente.innerText = cli
    coord.innerText = co
    
    bodyTabla = document.querySelector("#tBodyTablaClientes")
    fila.appendChild(cliente)
    fila.appendChild(coord)
    fila.appendChild(dem)
    bodyTabla.appendChild(fila)
}

function obtenerDemandas(){
    demandas = []
    for(let i=1; i<cantidadClientes;i++){
        id = "dem"+String(i)
        demandas.push(document.getElementById(id).value)
    }
    return demandas
}

function borrarRutas(){
    for (let i=0; i<segmentos.length;i++){
        segmentos[i].remove()
    }
}

function mostrarRutasOptimas(rutasRespuesta){

    borrarRutas()
    for(let i=0; i<rutasRespuesta.length;i++){
        rutaAux = []
        console.log("N: "+rutasRespuesta[i].length)
        for(let j=0; j<rutasRespuesta[i].length; j++){
            console.log(rutasRespuesta[i][j])
            rutaAux.push(puntos[rutasRespuesta[i][j]-1].coordenadas)
        }
        rutaAux.push(puntos[0].coordenadas)
        console.log(rutaAux)
        console.log("Ruta Aux "+JSON.stringify(rutaAux))
        resultado = L.Routing.control({
            waypoints: rutaAux,
            plan: L.Routing.plan(rutaAux, {
                createMarker: function(i, wp) {
                  return L.marker(wp.latLng, {
                    draggable: false,
                    icon: L.divIcon({className: 'my-div-icon'})
                  })
                }
              }),
            addWaypoints: false,
            routeWhileDragging: false,
            show: false,
            routeLine: (r) =>{
                var line = L.Routing.line(r,{
                    styles:[
                            {
                                color: RGB2HTML(random(256),random(256),random(256)), opacity: 0.9, weight: 5
                            },
                        ],
                })
                line.on("linetouched",()=>{
                    console.log("se tocó la linea")
                });
                return line;
            },
            router: router
        })
        segmentos.push(resultado)
        resultado.addTo(map)
    }
}

function reemplazarMarcas(){
    //Marcas 
    for(let i=0; i<marcas.length; i++){
        marcas[i].remove()
    }    
    console.log(marcas)
    marcasActuales = document.getElementsByClassName("leaflet-marker-icon")
    for(let i=0; i<marcasActuales.length; i++){
        marcasActuales[i].attributes.src.nodeValue = "pin.png"
    }    
}

var searchControl = L.esri.Geocoding.geosearch().addTo(map);
var results = L.layerGroup().addTo(map)


function buscarDireccion(direccion){
    salta = L.latLng(coordSalta[0],coordSalta[1])
    resultado = null
    resultados = L.esri.Geocoding.geocode().text(direccion).nearby(salta,10000).city("Salta").region('Salta').run(function (err, results, response) {
        if (err) {
          console.log(err);
          return;
        }
        for(let i=0; i<results.length; i++){
            console.log(results[i])
            if(results[i].properties.City == "Salta"){
                console.log(results[i])
            }
        }
        console.log(results)
    });
    console.log(resultados)

}

function calcularRutasOptimas(){
    enviarMatrizDistancias().then((rutasRespuesta)=>{
        console.log(rutasRespuesta)
        mostrarRutasOptimas(rutasRespuesta.rutas)
    })

}

async function  enviarPuntos(){
    console.log("puntos: ",puntos)
    resp = await fetch("http://localhost:5000/md2", {
        body: "puntos="+JSON.stringify(puntos),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
    })
    jsonResp = await resp.json()
    console.table(jsonResp.matriz)
}


document.querySelector("#botonCalcularRutasoOptimas").addEventListener('click',calcularRutasOptimas)
document.querySelector("#botonEnviarPuntos").addEventListener('click',enviarPuntos)
