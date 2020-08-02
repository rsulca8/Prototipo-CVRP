from Vertice import Vertice
from Arista import Arista
from Grafo import Grafo
from Solucion import Solucion
from Tabu import Tabu
import random 
import sys
import re
import math 
import copy
import numpy as np
from clsTxt import clsTxt
from time import time

class CVRP:
    #def __init__(self, M, D, nroV, capac, archivo, carpeta, solI, tADD, tDROP, tiempo, porcentaje, optimo):
    def __init__(self, M, D, nroV, capac, solI, tADD, tDROP, tiempo):
        self._G = Grafo(M, D)                #Grafo original
        self.__S = Solucion(M, D, sum(D))    #Solucion general del CVRP
        self.__Distancias = M                #Mareiz de distancias
        self.__Demandas = D                  #Demandas de los clientes
        self.__capacidadMax = capac          #Capacidad max por vehiculo
        self.__rutas = []                    #Soluciones por vehiculo (lista de soluciones)
        self.__nroVehiculos = nroV           #Nro de vehiculos disponibles
        self.__tipoSolucionIni = solI        #Tipo de solucion inicial (Clark & Wright, Vecino cercano, Secuencial o al Azar)
        self.__beta = 1                      #Parametro de dispersion
        self.__umbralMin = 0                 #Umbral de granularidad minimo
        self.__optimosLocales = []           #Lista de optimos locales 
        self.__tenureADD =  tADD             
        self.__tenureMaxADD = int(tADD*1.7)
        self.__tenureDROP =  tDROP
        self.__tenureMaxDROP = int(tDROP*1.7)
        self.__tiempoMaxEjec = float(tiempo)
        self.__S.setCapacidadMax(self.__capacidadMax)
        tiempoIni = time()
        self.__rutas = self.__S.rutasIniciales(self.__tipoSolucionIni, self.__nroVehiculos, self.__Demandas, self.__capacidadMax)
        # print("tiempo solucion inicial: ", time()-tiempoIni)
        self.__tiempoMaxEjec = self.__tiempoMaxEjec - ((time()-tiempoIni)/60)
        tiempoIni = time()
        print("\nSolucion Inicial:")
        self.__S = self.cargaSolucion(self.__rutas)
        print(str(self.__S.getV()))
        # print("tiempo solucion inicial: ", time()-tiempoIni)
        print("Nro vehiculos: ", self.__nroVehiculos)

    #Carga la solucion general a partir de las rutas
    def cargaSolucion(self, rutas):
        A = []
        V = []
        S = Solucion(self.__Distancias, self.__Demandas, sum(self.__Demandas))
        cap = 0
        costoTotal = 0
        sol_ini = ""
        
        #print("+-+-++-+-++-+-++-+-+Rutas+-+-++-+-++-+-++-+-+")
        for i in range(0, len(rutas)):
            s = rutas[i]
            try:
                costoTotal += float(s.getCostoAsociado())
            except AttributeError:
                print("s: "+str(s))
                print("rutas: "+str(rutas))
                print("i: ", i)
                a = 1/0
            cap += s.getCapacidad()
            A.extend(s.getA())
            V.extend(s.getV())
            sol_ini+="\nRuta #"+str(i+1)+": "+str(s.getV())
            #sol_ini+="\nAristas: "+str(s.getA())
            sol_ini+="\nCosto asociado: "+str(s.getCostoAsociado())+"      Capacidad: "+str(s.getCapacidad())+"\n"
        sol_ini+="\n--> Costo total: "+str(costoTotal)+"          Capacidad total: "+str(cap)
        #print(sol_ini)
        # print("+-+-++-+-++-+-++-+-++-+-++-+-++-+-++-+-+")
        S.setA(A)
        S.setV(V)
        costoTotal = round(costoTotal, 3)
        S.setCostoAsociado(costoTotal)
        S.setCapacidad(cap)
        S.setCapacidadMax(self.__capacidadMax)
        
        return S

    #Umbral de granularidad: phi = Beta*(c/(n+k))
    #Beta = 1  parametro de dispersion. Sirve para modificar el grafo disperso para incluir la diversificación y la intensificación
    #          durante la búsqueda.
    #c = valor de una sol. inicial
    #k = nro de vehiculos
    #n = nro de clientes
    def calculaUmbral(self, costo):
        c = costo
        k = self.__nroVehiculos
        n = len(self.__Distancias)-1
        phi = c/(n+k)
        phi = phi*self.__beta
        return round(phi,3)

    #+-+-+-+-+-+-+- Empezamos con Tabu Search +-+-+-+-+-+-+-+-+#
    #lista_tabu: tiene objetos de la clase Tabu (una arista con su tenure)
    #Lista_permitidos: o grafo disperso tiene elementos del tipo Arista que no estan en la lista tabu y su distancia es menor al umbral
    #nuevas_rutas: nuevas rutas obtenidas a partir de los intercambios
    #nueva_solucion: nueva solucion obtenida a partir de los intercambios
    #rutas_refer: rutas de referencia que sirve principalmente para evitar estancamiento, admitiendo una solucion peor y hacer los intercambios
    #             a partir de esas
    #solucion_refer: idem al anterior
    #tiempoIni: tiempo inicial de ejecucion - tiempoMax: tiempo maximo de ejecucion - tiempoEjecuc: tiempo de ejecución actual
    #iteracEstancamiento: iteraciones de estancamiento para admitir una solución peor, modificar Beta y escapar del estancamiento
    #iterac: cantidad de iteraciones actualmente
    def tabuSearch(self):
        lista_tabu = []
        ind_permitidos = np.array([], dtype = int)
        rutas_refer = copy.deepcopy(self.__rutas)
        nuevas_rutas = rutas_refer
        solucion_refer = copy.deepcopy(self.__S)
        nueva_solucion = solucion_refer
        nuevo_costo = self.__S.getCostoAsociado()
        
        #Atributos de tiempo e iteraciones
        tiempoIni = time()
        tiempoMax = float(self.__tiempoMaxEjec*60)
        tiempoEstancamiento = tiempoIni
        tiempoEjecuc = 0
        iteracEstancamiento = 1
        iteracEstancamiento_Opt = 1
        iteracEstancMax = 300
        iterac = 1
        indOptimosLocales = -2
        umbral = self.calculaUmbral(self.__S.getCostoAsociado())
        #porc_Estancamiento = 1.05
        #porc_EstancamientoMax = 1.15
        cond_Optimiz = True
        cond_Estancamiento = False

        Aristas_Opt = np.array([], dtype = object)
        for EP in self._G.getA():
            if(EP.getOrigen().getValue() < EP.getDestino().getValue() and EP.getPeso() <= umbral):
                Aristas_Opt = np.append(Aristas_Opt, EP)
                ind_permitidos = np.append(ind_permitidos, EP.getId())
        Aristas = Aristas_Opt
        ind_AristasOpt = copy.deepcopy(ind_permitidos)
        
        self.__optimosLocales.append(nuevas_rutas)
        
        while(tiempoEjecuc < tiempoMax):
            if(cond_Optimiz):
                ind_permitidos, Aristas = self.getPermitidos(Aristas, lista_tabu, umbral, solucion_refer, rutas_refer)    #Lista de elementos que no son tabu
                self.__umbralMin = 0
            cond_Optimiz = False
            ADD = []
            DROP = []
            
            ind_random = np.arange(0,len(ind_permitidos))
            random.shuffle(ind_random)
            
            indRutas = indAristas = []
            nuevo_costo, k_Opt, indRutas, indAristas, aristasADD, aristasDROP = nueva_solucion.evaluarOpt(self._G.getA(), ind_permitidos, ind_random, rutas_refer, cond_Estancamiento)

            nuevo_costo = round(nuevo_costo, 3)

            tenureADD = self.__tenureADD
            tenureDROP = self.__tenureDROP
            
            costoSolucion = self.__S.getCostoAsociado()

            #Si encontramos una mejor solucion que la tomada como referencia
            if(nuevo_costo < solucion_refer.getCostoAsociado() and aristasADD != []):
                cad = "\n+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+- Iteracion %d  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-\n" %(iterac)
                
                nuevas_rutas = nueva_solucion.swap(k_Opt, aristasADD[0], rutas_refer, indRutas, indAristas)
                #print("tiempo swap: "+str(time()-tiempo))
                #tiempo = time()
                nueva_solucion = self.cargaSolucion(nuevas_rutas)
                #print("tiempo cargaSol: "+str(time()-tiempo))
                if(nuevo_costo != nueva_solucion.getCostoAsociado()):
                    print("\n\nERROR!!!!!!")
                    print("ADD: "+str(aristasADD)+"     DROP: "+str(aristasDROP)+"\n\n")
                    print("nueva solucion:"+str(nueva_solucion.getV()))
                    print("solucion refer:"+str(solucion_refer.getV()))
                    
                    print("\nRutas ahora")
                    for i in range(0, len(rutas_refer)):
                        x = rutas_refer[i]
                        print("ruta #%d: %s" %(i, str(x.getV())))
                    print("nuevo costo: ", nuevo_costo,"          getCostoAsociado: ", nueva_solucion.getCostoAsociado())
                    a = 1/0
                                
                solucion_refer = nueva_solucion
                rutas_refer = nuevas_rutas
                
                #Si la nueva solucion es mejor que la obtenida hasta el momento
                if(nuevo_costo < costoSolucion):
                    tiempoTotal = time()-tiempoEstancamiento
                    print(cad)
                    cad = "\nLa solución anterior duró " + str(int(tiempoTotal/60))+"min "+ str(int(tiempoTotal%60))
                    cad += "seg    -------> Nuevo optimo local. Costo: "+str(nuevo_costo)
                    
                    self.__S = nueva_solucion
                    self.__rutas = nuevas_rutas
                    self.__beta = 1
                    tiempoEstancamiento = time()
                    if(len(self.__optimosLocales) >= 15):
                        self.__optimosLocales.pop(0)
                    self.__optimosLocales.append(nuevas_rutas)
                    indOptimosLocales = -2
                    cond_Estancamiento = False
                    print(cad)
                else:
                    cad += "\nSolucion peor. Costo: "+str(nueva_solucion.getCostoAsociado())
                cad += "\nLista tabu: "+str(lista_tabu)
                
                umbral = self.calculaUmbral(nueva_solucion.getCostoAsociado())
                tenureADD = self.__tenureMaxADD
                tenureDROP = self.__tenureMaxDROP
                cond_Optimiz = True
                Aristas = Aristas_Opt
                iteracEstancamiento = 1
                iteracEstancamiento_Opt = 1
                iteracEstancMax = 300
            #Si se estancó, tomamos a beta igual a 2
            elif(iteracEstancamiento > iteracEstancMax and self.__beta < 2):
                tiempoTotal = time()-tiempoEstancamiento
                print("Se estancó durante %d min %d seg. Incrementanos Beta para diversificar" %(int(tiempoTotal/60), int(tiempoTotal%60)))
                self.__beta = 2
                self.__umbralMin = umbral
                umbral = self.calculaUmbral(nueva_solucion.getCostoAsociado())
                cond_Optimiz = True
                iteracEstancamiento = 1
                iteracEstancMax = 200
                Aristas = Aristas_Opt
            #Si se estancó nuevamente, tomamos la proxima sol peor que difiera un 5% del optimo o la penultima de los optimos locales
            elif(iteracEstancamiento > iteracEstancMax and len(self.__optimosLocales) >= indOptimosLocales*(-1)):
                nuevas_rutas = self.__optimosLocales[indOptimosLocales]
                nueva_solucion = self.cargaSolucion(nuevas_rutas)
                costo = nueva_solucion.getCostoAsociado()
                tiempoTotal = time()-tiempoEstancamiento
                cad = "Se estancó durante %d min %d seg. Admitimos el penultimo optimo local " %(int(tiempoTotal/60), int(tiempoTotal%60))
                print(cad + "-->    Costo: "+str(costo))
                
                lista_tabu = []
                ind_permitidos = ind_AristasOpt
                umbral = self.calculaUmbral(costo)
                solucion_refer = nueva_solucion
                rutas_refer = nuevas_rutas
                cond_Optimiz = True
                Aristas = Aristas_Opt
                iteracEstancamiento = 1
                indOptimosLocales -= 1
                iteracEstancMax = 100
                self.__beta = 3
            elif(iteracEstancamiento > iteracEstancMax and aristasADD != []):
                print(aristasADD)
                nuevas_rutas = nueva_solucion.swap(k_Opt, aristasADD[0], rutas_refer, indRutas, indAristas)
                nueva_solucion = self.cargaSolucion(nuevas_rutas)
                tiempoTotal = time()-tiempoEstancamiento
                costo = nueva_solucion.getCostoAsociado()
                cad = "Se estancó durante %d min %d seg. Admitimos una solucion peor para diversificar" %(int(tiempoTotal/60), int(tiempoTotal%60))
                print(cad + "-->    Costo: "+str(costo))
                
                lista_tabu = []
                ind_permitidos = ind_AristasOpt
                umbral = self.calculaUmbral(costo)
                solucion_refer = nueva_solucion
                rutas_refer = nuevas_rutas
                cond_Optimiz = True
                iteracEstancamiento = 1
                Aristas = Aristas_Opt
                iteracEstancMax = 300    
            elif(ind_permitidos == []):
                nuevas_rutas = nueva_solucion.swap(k_Opt, aristasADD[0], rutas_refer, indRutas, indAristas)
                nueva_solucion = self.cargaSolucion(nuevas_rutas)            
                solucion_refer = nueva_solucion
                rutas_refer = nuevas_rutas
                umbral = self.calculaUmbral(nueva_solucion.getCostoAsociado())
                cond_Optimiz = True
                self.__beta = 3
                lista_tabu = []
                ind_permitidos = ind_AristasOpt
                Aristas = Aristas_Opt
                umbral = self.calculaUmbral(costo)
            else:
                nuevas_rutas = rutas_refer
                nueva_solucion = solucion_refer

            #Añado y elimino de la lista tabu
            if (aristasADD != []):
                ADD.append(Tabu(aristasADD[0], tenureADD))
                for i in range(0, len(aristasDROP)):
                    DROP.append(Tabu(aristasDROP[i], tenureDROP))
                self.decrementaTenure(lista_tabu, ind_permitidos)
                lista_tabu.extend(DROP)
                lista_tabu.extend(ADD)
            else:
                lista_tabu = []
                ind_permitidos = ind_AristasOpt
                Aristas = Aristas_Opt
                cond_Optimiz = True
            
            tiempoEjecuc = time()-tiempoIni
            iterac += 1
            iteracEstancamiento += 1
            iteracEstancamiento_Opt += 1
        #Fin del while. Imprimo los valores obtenidos
        self.escribirDatosFinales(tiempoIni, iterac, tiempoEstancamiento)
        
        return self.__S.solucionToJSON(), self.__S.getCostoAsociado()
    
    def getPermitidos(self, Aristas, lista_tabu, umbral, solucion, rutas_refer):
        AristasNuevas = []
        ind_permitidos = np.array([], dtype = int)

        #No tengo en consideracion a las aristas que exceden el umbral y las que pertencen a S
        A_solucion = copy.copy(solucion.getA())
        for EP in Aristas:
            pertS = False
            i=0
            while(i < len(A_solucion)):
                A_S = A_solucion[i]
                if A_S == EP:
                    A_solucion.pop(i)
                    pertS = True
                    break
                i+=1
            if(not pertS and self.__umbralMin <= EP.getPeso() and EP.getPeso() <= umbral):
                AristasNuevas.append(EP)
                ind_permitidos = np.append(ind_permitidos, EP.getId())
        ind_permitidos = np.unique(ind_permitidos)

        return ind_permitidos, AristasNuevas

    #Decrementa el Tenure en caso de que no sea igual a -1. Si luego de decrementar es 0, lo elimino de la lista tabu
    def decrementaTenure(self, lista_tabu, ind_permitidos):
        i=0
        while (i < len(lista_tabu)):
            elemTabu=lista_tabu[i]
            elemTabu.decrementaT()
            if(elemTabu.getTenure()==0):
                ind_permitidos = np.append(ind_permitidos, elemTabu.getElemento().getId())
                lista_tabu.pop(i)
                i-=1
            i+=1
        
    def escribirDatosFinales(self, tiempoIni, iterac, tiempoEstancamiento):
        print("\nMejor solucion obtenida: "+str(self.__rutas) + "       costo: "+str(self.__S.getCostoAsociado()))
        tiempoTotal = time() - tiempoIni
        print("\nTermino!! :)")
        print("Tiempo total: " + str(int(tiempoTotal/60))+"min "+str(int(tiempoTotal%60))+"seg\n")

