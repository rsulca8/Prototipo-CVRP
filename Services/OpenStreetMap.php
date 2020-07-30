<?php
/**
 * Provide a method of interfacing with OpenStreetMap servers.
 *
 * PHP Version 5
 *
 * @category Services
 * @package  Services_OpenStreetMap
 * @author   Ken Guest <kguest@php.net>
 * @license  BSD http://www.opensource.org/licenses/bsd-license.php
 * @version  Release: @package_version@
 * @link     http://pear.php.net/package/Services_OpenStreetMap
 * @link     http://wiki.openstreetmap.org/wiki/Api06
 */

/**
 * Pull in HTTP_Request2
 */
require_once 'HTTP/Request2.php';
spl_autoload_register(['Services_OpenStreetMap', 'autoload']);

/**
 * Services_OpenStreetMap - interface with OpenStreetMap
 *
 * @category  Services
 * @package   Services_OpenStreetMap
 * @author    Ken Guest <kguest@php.net>
 * @copyright 2010-2019 Ken Guest
 * @license   BSD http://www.opensource.org/licenses/bsd-license.php
 * @version   Release: @package_version@
 * @link      http://pear.php.net/package/Services_OpenStreetMap
 *
 *
 * @method int getTimeout()
 */
class Services_OpenStreetMap
{
    /**
     * Default config settings
     *
     * @var Services_OpenStreetMap_Config
     * @see Services_OpenStreetMap::getConfig
     * @see Services_OpenStreetMap::setConfig
     */
    protected $config = null;

    /**
     * Retrieved XML
     *
     * @var string
     *
     * @internal
     */
    protected $xml = null;

    /**
     * API Object
     *
     * @var Services_OpenStreetMap_API_V06
     *
     * @internal
     */
    protected $api = null;

    /**
     * Transport
     *
     * @var Services_OpenStreetMap_Transport
     */
    protected $transport = null;

    /**
     * Autoloader
     *
     * @param string $class Name of class
     *
     * @return boolean
     */
    public static function autoload(string $class): bool
    {
        $dir = dirname(__DIR__);
        $file = $dir . '/' . str_replace('_', '/', $class) . '.php';
        if (file_exists($file)) {
            return include_once $file;
        }
        return false;
    }

    /**
     * Constructor; which optionally sets config details.
     *
     * @param array $configuration Defaults to empty array if none provided
     *
     * @return Services_OpenStreetMap
     */
    public function __construct(array $configuration = [])
    {
        $config = new Services_OpenStreetMap_Config();
        $this->setConfig($config);

        $transport = new Services_OpenStreetMap_Transport_HTTP();
        $transport->setConfig($config);

        if ($transport !== null) {
            $this->setTransport($transport);
            $config->setTransport($transport);
        }
        $config->setValue($configuration);

        $version = $config->getValue('api_version');

        $api = "Services_OpenStreetMap_API_V" . str_replace('.', '', $version);
        $this->api = new $api();
        $this->api->setTransport($transport);
        $this->api->setConfig($config);
    }

    /**
     * Convert a 'bbox' ordered set of coordinates to ordering required for get
     * method.
     *
     * That is, return a,b,c,d as b,a,d,c
     *
     * <code>
     * $osm = new Services_OpenStreetMap();
     * $osm->get($osm->bboxToMinMax($minLat, $minLon, $maxLat, $maxLon));
     * file_put_contents("area_covered.osm", $osm->getXML());
     * </code>
     *
     * @param mixed $minLat min Latitude
     * @param mixed $minLon min Longitude
     * @param mixed $maxLat max Latitude
     * @param mixed $maxLon max Longitude
     *
     * @return array
     */
    public function bboxToMinMax($minLat, $minLon, $maxLat, $maxLon): array
    {
        return [$minLon, $minLat, $maxLon, $maxLat];
    }

    /**
     * Get XML describing area prescribed by the given co-ordinates.
     *
     * Use in conjunction with bboxToMinMax if required.
     *
     * <code>
     * // $osm->get($osm->bboxToMinMax($minLat, $minLon, $maxLat, $maxLon));
     * $osm = new Services_OpenStreetMap();
     * $osm->get(-8.3564758, 52.821022799999994, -7.7330017, 53.0428644);
     * file_put_contents("area_covered.osm", $osm->getXML());
     * </code>
     *
     * @param string $minLon min Longitude (leftmost point)
     * @param string $minLat min Latitude (bottom point)
     * @param string $maxLon max Longitude (rightmost point)
     * @param string $maxLat max Latitude (top point)
     *
     * @return string
     * @throws HTTP_Request2_Exception
     * @throws Services_OpenStreetMap_Exception
     */
    public function get(
        string $minLon,
        string $minLat,
        string $maxLon,
        string $maxLat
    ): string {
        $config = $this->getConfig();
        $url = $config->getValue('server')
            . 'api/'
            . $config->getValue('api_version')
            . "/map?bbox=$minLon,$minLat,$maxLon,$maxLat";
        $response = $this->getTransport()->getResponse($url);
        $this->xml = $response->getBody();
        return $this->xml;
    }

    /**
     * Get co-ordinates of some named place
     *
     * Place can be comma delimited for precision. e.g. 'Limerick, Ireland'
     *
     * <code>
     * $coords = $osm->getCoordsOfPlace('Limerick, Ireland');
     * </code>
     *
     * @param string $place name
     *
     * @return array Associated array of lat/lon values.
     * @throws Services_OpenStreetMap_Exception If the place can not be found.
     */
    public function getCoordsOfPlace(string $place): array
    {
        $places = $this->getPlace($place);
        if (empty($places)) {
            throw new Services_OpenStreetMap_Exception(
                'Could not get coords for ' . $place
            );
        }
        $attrs = $places[0]->attributes();
        return ['lat' => (string) $attrs['lat'], 'lon' => (string) $attrs['lon']];
    }

    /**
     * Return a structured result set for $place
     *
     * @param string $place          Location to search for details of
     * @param string $format         Format to retrieve. json/xml (default)
     * @param bool   $addressdetails Gathers more details of place if TRUE.
     *
     * @return mixed
     */
    public function getPlace(
        string $place,
        string $format = 'xml',
        bool $addressdetails = false
    ) {
        $nominatim = new Services_OpenStreetMap_Nominatim(
            $this->getTransport()
        );
        return $nominatim
            ->setAcceptLanguage($this->config->getValue('accept-language'))
            ->setAddressdetails((int) $addressdetails)
            ->setFormat($format)
            ->search($place, 1);
    }

    /**
     * ReverseGeocode
     *
     * Peform a reverse search/geoencoding.
     *
     * @param string $lat            Latitude
     * @param string $lon            Longitude
     * @param bool   $addressdetails Whether to include address details in results
     * @param int    $zoom           Zoom level to search at
     * @param string $format         Format to retrieve. json/xml (default)
     *
     * @return object|string
     */
    public function reverseGeocode(
        string $lat,
        string $lon,
        bool $addressdetails = true,
        int $zoom = 18,
        string $format = 'xml'
    ) {
        $nominatim = new Services_OpenStreetMap_Nominatim(
            $this->getTransport()
        );
        return $nominatim
            ->setFormat($format)
            ->reverseGeocode($lat, $lon, (int) $addressdetails, $zoom);
    }

    /**
     * Given the results of a call to func_get_args return an array of unique
     * valid IDs specified in those results (either 1 per argument or each
     * argument containing an array of IDs).
     *
     * @param mixed $args results of call to func_get_args
     *
     * @return array
     */
    public static function getIDs($args): array
    {
        $IDs = [];
        foreach ($args as $arg) {
            if (is_array($arg)) {
                $IDs = array_merge($arg, $IDs);
            } elseif (is_numeric($arg)) {
                $IDs[] = $arg;
            }
        }
        return array_unique($IDs);
    }

    /**
     * Load XML from [cache] file.
     *
     * @param string $file filename
     *
     * @return void
     */
    public function loadXml(string $file): void
    {
        $this->xml = '';
        $contents = file_get_contents($file);
        if ($contents !== false) {
            $this->xml = $contents;
        }
    }

    /**
     * Return XML.
     *
     * @return string
     */
    public function getXml():?string
    {
        return $this->xml;
    }

    /**
     * Search based on given criteria.
     *
     * Returns an array of objects such as Services_OpenStreetMap_Node etc.
     *
     * <code>
     *  $osm = new Services_OpenStreetMap();
     *
     *  $osm->loadXML("./osm.osm");
     *  $results = $osm->search(array("amenity" => "pharmacy"));
     *  echo "List of Pharmacies\n";
     *  echo "==================\n\n";
     *
     *  foreach ($results as $result) {
     *      $name = $result->getTag('name');
     *      $addrStreet = $result->getTag('addr:street');
     *      $addrCity = $result->getTag('addr:city');
     *      $addrCountry = $result->getTag('addr:country');
     *      $addrHouseName = $result->getTag('addr:housename');
     *      $addrHouseNumber = $result->getTag('addr:housenumber');
     *      $openingHours = $result->getTag('opening_hours');
     *      $phone = $result->getTag('phone');
     *
     *      $line1 = ($addrHouseNumber) ? $addrHouseNumber : $addrHouseName;
     *      if ($line1 != null) {
     *          $line1 .= ', ';
     *      }
     *      echo  "$name\n{$line1}{$addrStreet}\n$phone\n$openingHours\n\n";
     *  }
     * </code>
     *
     * @param array $criteria what to search for
     *
     * @return array
     */
    public function search(array $criteria): array
    {
        $results = [];

        $xmlElement = simplexml_load_string($this->xml);
        if (!$xmlElement) {
            return [];
        }
        foreach ($criteria as $key => $value) {
            foreach ($xmlElement->xpath('//way') as $node) {
                $results = array_merge(
                    $results,
                    $this->searchNode($node, $key, $value, 'way')
                );
            }
            foreach ($xmlElement->xpath('//node') as $node) {
                $results = array_merge(
                    $results,
                    $this->searchNode($node, $key, $value, 'node')
                );
            }
        }
        return $results;
    }

    /**
     * Create an object of specified class and XML
     *
     * @param string $class     Class name of object
     * @param string $ObjectXml XML describing object to be created
     *
     * @return Services_OpenStreetMap_Object
     */
    private function createObject(string $class, string $ObjectXml)
    {
        $obj = new $class();
        $obj->setTransport($this->getTransport());
        $obj->setConfig($this->getConfig());
        $obj->setXml(simplexml_load_string($ObjectXml));
        return $obj;
    }

    /**
     * Search node for a specific key/value pair, allowing for value to be
     * included in a semicolon delimited list, or allowing for a wild-card
     * search.
     *
     * @param SimpleXMLElement $node  Node to search
     * @param string           $key   Key to search for (Eg 'amenity')
     * @param string           $value Value to search for (Eg 'pharmacy')
     * @param string           $type  Type of object to return.
     *
     * @return array
     */
    private function searchNode(
        SimpleXMLElement $node,
        string $key,
        string $value,
        string $type
    ): array {
        $class = 'Services_OpenStreetMap_' . ucfirst(strtolower($type));
        $results = [];
        foreach ($node->tag as $tag) {
            if ($tag['k'] == $key) {
                if ($tag['v'] == $value) {
                    $results[] = $this->createObject($class, $node->saveXML());
                } elseif ($value === '*') {
                    $results[] = $this->createObject($class, $node->saveXML());
                } elseif (strpos($tag['v'], ';')) {
                    $array = explode(';', $tag['v']);
                    if (in_array($value, $array)) {
                        $results[] = $this->createObject($class, $node->saveXML());
                    }
                }
            }
        }
        return $results;
    }

    /**
     * Set Config object
     *
     * @param Services_OpenStreetMap_Config $config Config settings.
     *
     * @return Services_OpenStreetMap
     */
    public function setConfig(
        Services_OpenStreetMap_Config $config
    ): Services_OpenStreetMap {
        $this->config = $config;
        return $this;
    }

    /**
     * Get current Config object
     *
     * @return Services_OpenStreetMap_Config
     */
    public function getConfig(): \Services_OpenStreetMap_Config
    {
        return $this->config;
    }

    /**
     * Get current Transport object.
     *
     * @return Services_OpenStreetMap_Transport
     */
    public function getTransport(): \Services_OpenStreetMap_Transport
    {
        return $this->transport;
    }

    /**
     * Set Transport object.
     *
     * @param Services_OpenStreetMap_Transport $transport transport object
     *
     * @return Services_OpenStreetMap
     */
    public function setTransport(
        Services_OpenStreetMap_Transport $transport
    ): Services_OpenStreetMap {
        $this->transport = $transport;
        return $this;
    }

    /**
     * Execute method provided by API class.
     *
     * If possible, call the appropriate method of the API instance.
     *
     * @param string $name      Name of missing method to call.
     * @param array  $arguments Arguments to be used when calling method.
     *
     * @return mixed
     * @throws Services_OpenStreetMap_Exception If the method is not supported
     *                                          by the API instance.
     */
    public function __call(string $name, array $arguments)
    {
        $configMethods = [
            'getApiStatus',
            'getDatabaseStatus',
            'getGpxStatus',
            'getMaxArea',
            'getMaxElements',
            'getMaxNodes',
            'getMaxNoteArea',
            'getMaxVersion',
            'getMinVersion',
            'getTimeout',
            'getTracepointsPerPage',
        ];
        if (in_array($name, $configMethods)) {
            return $this->getConfig()->$name();
        }
        if (method_exists($this->api, $name)) {
            return call_user_func_array([$this->api, $name], $arguments);
        }
        throw new Services_OpenStreetMap_Exception(
            sprintf(
                'Method %s does not exist.',
                $name
            )
        );
    }
}
// vim:set et ts=4 sw=4:
