var map 
var coords 
var puntos = []
var marcas = []
var segmentos = []  
var distancias = []
var matrizDistancias = []
var matrizId = 0
var capas = []
var direcciones = []
var capaPosiblesRutas = null
var pilaClientes = []
var instrucciones = []
var cantidadClientes = 1
var colores = []
var desactivarEvento = false
var pin = L.icon({
    iconUrl: "pin.png",
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
rutasDOM = []

var router = new L.Routing.osrmv1({serviceUrl: 'http://localhost:7000/route/v1'})

map = L.map('map',{
    scrollWheelZoom: false,
    zoomAnimation: false
}).setView(coordSalta, 14);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors', maxZoom: 18 }).addTo(map);
crearDeposito()
map.doubleClickZoom.disable();
map.addEventListener("dblclick ",crearMarca)  
leerXLSX()

function crearMarca(ev){
    coord= ev.latlng
    lat = coord.lat
    lng = coord.lng
    console.log(cantidadClientes)
    
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
        dir = ""
        L.esri.Geocoding.reverseGeocode().latlng([lat,lng]).run((error, result, response)=>{
            agregarClienteTabla(cantidadClientes-1,result.address.ShortLabel,1)

        })
        pilaClientes.push(cantidadClientes)
    }
    cantidadClientes++ 
    asignarIdRutas()

}

function crearDeposito(){
    coord = coordSalta
    lat = coord.lat
    lng = coord.lng

    marca = L.marker(coordSalta, {icon: iconoDeposito}).addTo(map);
    marcas.push(marca)
    marca.bindPopup("Deposito").openPopup();
    puntos.push({nodo: cantidadClientes,coordenadas:{lat:coordSalta[0],lng:coordSalta[1]}})
    agregarClienteTabla(cantidadClientes,"Depósito",0)
    pilaClientes.push(cantidadClientes)
    cantidadClientes++
}

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

function crearRuta(){
    
}

function borrarRutas(){
    for (let i=0; i<segmentos.length;i++){
        segmentos[i].remove()
    }
}

async function mostrarRutasOptimas(rutasRespuesta){

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
                                color: (() =>{    
                                    color = RGB2HTML(random(256),random(256),random(256));
                                    colores.push(color)
                                    return color})(),
                                opacity: 0.9,
                                weight: 5
                            },
                        ],
                        addWaypoints: false,
                
                    })
                    return line
                },
            router: router
        })
        resultado.on("routesfound",(r)=>{
            instrucciones.push({ruta: i,instrucciones:r.routes[0].instructions})
        })
        segmentos.push(resultado)
        resultado.addTo(map)
        ocultarInstrucciones()
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


async function buscarDireccion(direccion){
    salta = L.latLng(coordSalta[0],coordSalta[1])
    resultado = null
    resultado = await fetch("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?outSr=4326&forStorage=false&outFields=*&maxLocations=20&singleLine=indalecio%20Gomez%2032&location=-65.4106%2C-24.7892&distance=10000&city=Salta&region=Salta&f=json",{
        method: "GET",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
    jsonDireccion = await resultado.json()
    console.log(jsonDireccion)
}

function calcularRutasOptimas(){
    enviarMatrizDistancias().then((rutasRespuesta)=>{
        console.log(rutasRespuesta)
        mostrarRutasOptimas(rutasRespuesta.rutas).then((resp)=>{
            console.log(resp)
        })
          asignarIdRutas()         
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

async function SVG(){
    svg = await fetch("iconos/SVG/pin0.svg",{
        method: "GET",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
    })

    svgText = await svg.text()
    console.log(encodeURI("data:image/svg+xml," + svgText))
    return encodeURI("data:image/svg+xml," + svgText)

}

function leerXLSX(){
    var url = "Direcciones.xlsx";
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    var valores = null
    var latLng
    
    oReq.onload = function(e) {
        var valores = leerDatos();

        function leerDatos(){
            var arraybuffer = oReq.response;
        
            // Convertimos los datos a string
            var datos = new Uint8Array(arraybuffer);
            var arrayAux = new Array();
            for(var i = 0; i != datos.length; ++i) arrayAux[i] = String.fromCharCode(datos[i]);
            var bstr = arrayAux.join("");
        
            // Leemos el archivo .xlsx
            var workbook = XLSX.read(bstr, {type:"binary"});
        
            //Leemos los nombres de los atributos
            var first_sheet_name = workbook.SheetNames[0];
            //La primera hoja de trabajo
            var worksheet = workbook.Sheets[first_sheet_name];
            valores = XLSX.utils.sheet_to_json(worksheet,{raw:true});
            return valores;
        }

        for(var i=0; i<valores.length; i++){
            direcciones.push(buscarDireccion(valores[i].Direccion, valores[i].Ciudad, valores[i].Provincia, valores[i].Pais))
        }
    }
    oReq.send();
}

function buscarDireccion(Direccion, Ciudad, Provincia, Pais){
    salta = L.latLng(coordSalta[0],coordSalta[1])
    resultadoLatLng = null
    var calle = Direccion.split(" ")
    if(calle[0].toLowerCase() == "hernando"){
        calle[0] = "hijo"
    }
    Direccion = calle.join(' ')
    return L.esri.Geocoding.geocode().address(Direccion).city(Ciudad).region(Provincia).run(function (err, resultados, response) {
        if (err) {
          console.log(err);
          return;
        }
        coordenadas = [resultados.results[0].latlng.lat, resultados.results[0].latlng.lng]

        coordenadas = [resultados.results[0].latlng.lat, resultados.results[0].latlng.lng]
        marca = L.marker(coordenadas, {icon: pin}).addTo(map);
        marca.bindPopup("Cliente "+cantidadClientes).openPopup();
        marcas.push(marca)
        puntos.push({nodo: cantidadClientes,coordenadas:{lat:coordenadas[0],lng:coordenadas[1]}})
        agregarClienteTabla(cantidadClientes,Direccion,1)
        pilaClientes.push(cantidadClientes)
        cantidadClientes++
    })

}

function rutaTocada(r){
    idRuta = this.id
    console.log("Se tocó la ruta "+this.id)
    var instruccionesRuta 
    console.log(r)
    for(let i=0; i<instrucciones.length;i++){
        if(instrucciones[i].ruta==idRuta){
            instruccionesRuta=instrucciones[idRuta].instrucciones
        }
    }
    LanzarPopUpInstrucciones(instrucciones,this.id)
}

function asignarIdRutas(){
    for(let i=0;i<rutasDOM.length;i++){
        rutasDOM[i].removeEventListener('click',rutaTocada)
    }
    rutasDOM = []
    lfe = document.getElementsByClassName("leaflet-interactive")

    rutasDOM = []
    for(let i=0; i<lfe.length;i++){
        for (let j=0; j<colores.length; j++){
            if (lfe[i].getAttribute("stroke")==colores[j]){
                rutasDOM.push(lfe[i])
            }
        }
    }   
    for(let i=0;i<rutasDOM.length;i++){
        rutasDOM[i].id = i
        rutasDOM[i].addEventListener('click',rutaTocada)
        rutasDOM[i].className +="rutaClick"     
    }
    console.log(rutasDOM)
    if(desactivarEvento == false)
        map.addEventListener("click",asignarIdRutas)
    if(desactivarEvento == false)
        desactivarEvento = true
}

function crearTablaInstrucciones(instr,r){
    bodyTablaPopUp.innerHTML = ""
    bodyTablaPopUp = document.getElementById("bodyTablaPopUp")
    instruccionesRuta = instr[r].instrucciones


    for(let i=-1; i<instruccionesRuta.length;i++){
        fila = document.createElement("tr")
        col1 = document.createElement("td")
        if(i<0){
            col1.innerText = "INSTRUCCIONES RUTA "+r 
            col1.style.fontWeight = "900"
            col1.style.font = "italic bold 36px arial,serif"; 
        }
        else{
            col1.innerText = instruccionesRuta[i].text 
        }
        fila.appendChild(col1)
        bodyTablaPopUp.appendChild(fila)
    }

}


function LanzarPopUpInstrucciones(instrucciones,r){
    divPopUp = document.getElementById("divPopUp") 
    divPopUp.style.display = "block"
    document.getElementById("map").style.zIndex = "-1"
    crearTablaInstrucciones(instrucciones,r)
}

function cerrarPopUp(){
    divPopUp.style.display = "none"
    document.getElementById("map").style.zIndex = ""
    bodyTablaPopUp.innerHTML = ""
}



map.addEventListener("click",asignarIdRutas)
document.querySelector("#botonCalcularRutasoOptimas").addEventListener('click',calcularRutasOptimas)
document.querySelector("#cerrar").addEventListener("click",cerrarPopUp)
