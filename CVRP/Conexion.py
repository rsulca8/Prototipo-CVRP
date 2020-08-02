from flask import Flask, request,jsonify,make_response,json
from flask_restful import Resource, Api
from flask_cors import CORS
from CVRP import CVRP
from Solucion import Solucion
app = Flask(__name__)
api = Api(app)
CORS(app)
matrices = {}

@app.route("/get/<matriz_id>")
def get(matriz_id):
    print("recibió", matriz_id)
    return matriz_id


@app.route('/post', methods = ['POST'])
def post():   
    matrizDistancias = json.loads(request.form['data'])
    nroVehiculos = json.loads(request.form['nroVehiculos'])
    demandas = json.loads(request.form['demandas'])
    capacidadMax = json.loads(request.form['capacidadMax'])

    demandas = [int(d) for d in demandas]

    print("tipo matriz",type(matrizDistancias[0][3]))
    print(type(nroVehiculos))
    print("tipo demanda",type(demandas[3]))
    print(type(capacidadMax))

    print(str(matrizDistancias))
    print(str(nroVehiculos))
    print(str(demandas))
    print(str(capacidadMax))
    cvrp = CVRP(matrizDistancias,demandas,nroVehiculos,capacidadMax,0,3,4,0.02)
    rutas, costoAsociado = cvrp.tabuSearch()
    resp = json.dumps({
        "rutas":rutas,
        "costoAsociado":json.dumps(costoAsociado),
        })
    return resp





if __name__ == '__main__':
    app.run(debug=True)